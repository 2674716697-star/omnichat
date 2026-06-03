  // =========================================================================
  // STORY PARSER — pure functions for parsing @@SCENE blocks, A/B/C/D choices,
  // character statuses, and other narrative text extraction.
  // No DOM, no state mutation, no side effects.
  // =========================================================================

  function getSceneLine(block, label) {
    const match = block.match(new RegExp('^' + label + '[:：]\\s*(.*)$', 'm'));
    return match ? match[1].trim() : '';
  }

  function getSceneLineAny(block, labels) {
    for (const label of labels) {
      const value = getSceneLine(block, label);
      if (value) return value;
    }
    return '';
  }

  function getSceneDirections(block) {
    // Supported direction labels (priority order)
    var dirLabels = [
      '后续剧情走向', '后续走向', '剧情走向', '走向',
      '发展方向', '下一步剧情', '下一步', '接下来'
    ];
    // Labels that should stop direction capture (subsequent fields)
    var stopLabels = ['内心', '风险', '情节', '剧情', '剧情总结', '身体', '身体细节', '精神', '精神评分', '评分', '目标', '当前目标', '姿势', '角色', '当前角色', '@@END'];

    var labelGroup = dirLabels.join('|');
    var multiLineRe = new RegExp('^(?:' + labelGroup + ')[:：]?\\s*([\\s\\S]*)$', 'm');
    var match = block.match(multiLineRe);

    if (match) {
      var raw = match[1];
      var allLines = raw.split('\n');

      // Truncate at first stop label
      var stopRe = new RegExp('^(' + stopLabels.join('|') + ')[:：]', 'i');
      var stopIdx = allLines.length;
      for (var si = 0; si < allLines.length; si++) {
        if (stopRe.test(allLines[si].trim())) { stopIdx = si; break; }
      }

      var lines = allLines.slice(0, stopIdx)
        .map(function(line) { return line.trim(); })
        .filter(function(line) { return line && line !== '@@END'; });

      var parsed = [];
      var letters = ['A', 'B', 'C', 'D'];
      var autoLetterIdx = 0;

      for (var i = 0; i < lines.length && parsed.length < 4; i++) {
        var line = lines[i];

        // Stop if this line looks like a field label
        if (stopRe.test(line)) break;

        var letterMatch = line.match(/^([A-Da-d])[\.\)、：:\s]\s*(.+)/);
        if (letterMatch) {
          var letter = letterMatch[1].toUpperCase();
          var content = letterMatch[2].trim();
          if (content) { parsed.push(letter + '. ' + content); autoLetterIdx = Math.max(autoLetterIdx, letters.indexOf(letter) + 1); }
          continue;
        }
        var parenMatch = line.match(/^[\(（]([A-Da-d])[\)）]\s*(.+)/);
        if (parenMatch) {
          var pLetter = parenMatch[1].toUpperCase();
          var pContent = parenMatch[2].trim();
          if (pContent) { parsed.push(pLetter + '. ' + pContent); autoLetterIdx = Math.max(autoLetterIdx, letters.indexOf(pLetter) + 1); }
          continue;
        }
        var numMatch = line.match(/^(\d{1,2})[\.\)、：:\s]\s*(.+)/);
        if (numMatch) {
          var num = parseInt(numMatch[1], 10);
          var nContent = numMatch[2].trim();
          if (nContent && num >= 1 && num <= 4) {
            parsed.push(letters[num - 1] + '. ' + nContent);
            autoLetterIdx = Math.max(autoLetterIdx, num);
          }
          continue;
        }
        var bulletMatch = line.match(/^[-·•*]\s*(.+)/);
        if (bulletMatch) {
          var bContent = bulletMatch[1].trim();
          if (bContent && autoLetterIdx < 4) {
            parsed.push(letters[autoLetterIdx] + '. ' + bContent);
            autoLetterIdx++;
          }
          continue;
        }
        if (line && autoLetterIdx < 4) {
          parsed.push(letters[autoLetterIdx] + '. ' + line);
          autoLetterIdx++;
        }
      }
      if (parsed.length) return parsed.join('\n');
    }

    var singleLineMatch = getSceneLineAny(block, dirLabels);
    if (singleLineMatch) return 'A. ' + singleLineMatch;
    return '';
  }

  function parseDirectionOptions(directions) {
    if (!directions) return [];
    var lines = directions.split('\n');
    var options = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      // Match "A. xxx", "A、xxx", "A) xxx", "A: xxx", "A：xxx", "(A) xxx"
      var m = line.match(/^([A-Da-d])[\.\)、：:\s]\s*(.+)/) || line.match(/^[\(（]([A-Da-d])[\)）]\s*(.+)/);
      if (m) {
        options.push({ letter: m[1].toUpperCase(), content: m[2].trim() });
      } else {
        var nm = line.match(/^(\d{1,2})[\.\)、：:\s]\s*(.+)/);
        if (nm) {
          var num = parseInt(nm[1], 10);
          var letters = ['A', 'B', 'C', 'D'];
          if (num >= 1 && num <= 4) options.push({ letter: letters[num - 1], content: nm[2].trim() });
        }
      }
    }
    return options;
  }

  function parseCharacterStatuses(block) {
    var results = [];
    // Try new multi-character format: lines starting with [角色] or [人物]
    var charBlocks = block.split(/\n(?=\[(?:角色|人物)\])/);
    if (charBlocks.length <= 1) {
      // Fallback: single character from old fields
      var single = {
        name: getSceneLineAny(block, ['角色','当前角色','POV']) || '主角',
        relation: '主角',
        isMain: true,
        mental: getSceneLineAny(block, ['精神','精神状态']),
        mentalScore: normalizeMentalScore(getSceneLineAny(block, ['精神评分','评分'])),
        physical: getSceneLineAny(block, ['身体','身体状态']),
        bodyDetails: getSceneBodyDetails(block),
        goal: getSceneLineAny(block, ['目标','当前目标']),
        posture: getSceneLineAny(block, ['姿势','当前姿势']),
        innerVoice: getSceneLineAny(block, ['内心','内心回声']),
      };
      if (single.mental || single.physical || single.bodyDetails) results.push(single);
      return results;
    }
    for (var bi = 0; bi < charBlocks.length; bi++) {
      var cb = charBlocks[bi];
      var isMain = /\[(?:角色|人物)\](?:.*主角)/.test(cb) || bi === 0;
      var c = {
        name: getSceneLineAny(cb, ['名[称字]?','角色']) || (isMain ? '主角' : '人物' + (bi+1)),
        relation: getSceneLineAny(cb, ['关系','定位']) || (isMain ? '主角' : ''),
        isMain: isMain,
        mental: getSceneLineAny(cb, ['精神','精神状态']),
        mentalScore: normalizeMentalScore(getSceneLineAny(cb, ['精神评分','评分'])),
        physical: getSceneLineAny(cb, ['身体','身体状态']),
        bodyDetails: getSceneBodyDetails(cb),
        goal: getSceneLineAny(cb, ['目标','当前目标']),
        posture: getSceneLineAny(cb, ['姿势','当前姿势']),
        innerVoice: getSceneLineAny(cb, ['内心','内心回声']),
      };
      if (c.mental || c.physical || c.bodyDetails || c.goal) results.push(c);
    }
    if (!results.length) return [];
    return results;
  }

function getSceneBodyDetails(block) {
    // Extract multi-line body details under "身体细节:" label
    var labels = ['身体细节', '感官细节'];
    var labelGroup = labels.join('|');
    var re = new RegExp('^(?:' + labelGroup + ')[:：]?\\s*([\\s\\S]*?)(?:\\n(?:' + labelGroup + '|情节|剧情|剧情总结|风险|内心|走向|@@END)|$)', 'm');
    var match = block.match(re);
    if (!match) {
      // Fallback: single-line via getSceneLineAny
      var single = getSceneLineAny(block, labels);
      return single;
    }
    var raw = match[1];
    var lines = raw.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l && l !== '@@END'; });
    // Strip leading bullet markers
    lines = lines.map(function(l) { return l.replace(/^[-·•*\d{1,2}.\)、\s]+/, '').trim(); }).filter(Boolean);
    return lines.join('\n');
  }

  function parseSceneChoiceInput(text) {
    if (!text) return null;
    var t = text.replace(/\s+/g, '').trim();
    if (!t) return null;
    // Direct single letter: "A", "a", "B。", "C.", "D", "A." etc.
    var directMatch = t.match(/^([A-Da-d])[。.．、]*$/);
    if (directMatch) return directMatch[1].toUpperCase();
    // "选A", "选 A", "选择B", "我选C", "走D", "选A吧", "就B了", "要C", "想选D"
    var choiceMatch = t.match(/^(?:选[择]?|我选|走|就|要|想选|选择)\s*([A-Da-d])\s*(?:吧|了|的|啦|啊)?[。.．、]*$/);
    if (choiceMatch) return choiceMatch[1].toUpperCase();
    // "选项A", "路线B", "分支C", "方向D", "走向A"
    var labelMatch = t.match(/^(?:选项|路线|分支|方向|走向)\s*([A-Da-d])[。.．、]*$/);
    if (labelMatch) return labelMatch[1].toUpperCase();
    // "A路线", "B分支", "C选项"
    var suffixMatch = t.match(/^([A-Da-d])\s*(?:路线|分支|选项|方向)[。.．、]*$/);
    if (suffixMatch) return suffixMatch[1].toUpperCase();
    // Story chip format: "我选择A：选项文本。请沿这个分支继续。"
    var storyChipMatch = t.match(/^我选择\s*([A-Da-d])[：:].+。请沿这个分支继续。$/);
    if (storyChipMatch) return storyChipMatch[1].toUpperCase();
    return null;
  }

  function buildSceneFallbackDirections(conv, contextSnippet) {
    // Conservative story directions when the model omits @@SCENE.
    // Uses NPC names and context to produce more relevant options.
    var npcName = '';
    if (conv && conv.sceneNpcs && conv.sceneNpcs.length) {
      npcName = conv.sceneNpcs[0].name || '';
    }
    var lines = [
      'A. 继续深入调查，主动寻找更多线索和突破口',
      'B. 暂时退一步观察局势变化，寻找更安全的切入点'
    ];
    if (npcName) {
      lines.push('C. 与' + npcName + '进一步接触，试探对方真实意图和掌握的信息');
      lines.push('D. 改变行动节奏，采取' + npcName + '意料之外的行动来试探隐藏风险');
    } else {
      lines.push('C. 与关键人物接触，试探对方真实意图和掌握的信息');
      lines.push('D. 改变行动节奏，采取意料之外的行动来试探隐藏风险');
    }
    return lines.join('\n');
  }
