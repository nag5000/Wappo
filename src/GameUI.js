(function() {
  Wappo.GameWindow = GameWindow;
  var proto = GameWindow.prototype;

  function GameWindow(container, options) {
    options = options || {};

    this.game = null;
    this.gameField = null;
    this.levels = [];
    this.currentLevel = null;
    this.maxLevelNumberDiscovered = 0;
    this.animating = false;
    this.timeoutIds = [];

    this.walkAnimationDuration = options.walkAnimationDuration || 500;
    this.moveDistance = options.moveDistance || 50;
    this.gameoverWinDelay = options.gameoverWinDelay || 2500;
    this.gameoverLoseDelay = options.gameoverLoseDelay || 1500;
    this.onLevelComplete = options.onLevelComplete;

    this.init(container, options);
  }

  proto.animateWalk = function(unit, success) {
    var direction = this.getUnitWalkDirection(unit);
    if (!direction) {
      success();
      return;
    }

    unit.PrevPosition = unit.CurrentPosition;

    unit.element.classList.remove('wappo-walk-' + unit.walkDirection);
    unit.element.classList.remove('wappo-walk-direction-' + unit.walkDirection);

    unit.walkDirection = direction;

    unit.element.classList.add('wappo-walk-' + direction);
    unit.element.classList.add('wappo-walk-direction-' + direction);

    var cssProperty;
    if (direction === 'left' || direction === 'right') {
      cssProperty = 'left';
    } else {
      cssProperty = 'top';
    }

    var sign = (direction === 'left' || direction === 'top') ? -1 : 1;
    var from = parseInt(unit.element.style[cssProperty]) || 0;
    var to = from + sign * this.moveDistance;
    var easing = 'linear';

    TinyAnimate.animateCSS(unit.element, cssProperty, 'px',
      from, to, this.walkAnimationDuration, easing,
      function() {
        unit.element.classList.remove('wappo-walk-' + direction);
        success();
      });
  };

  proto.getUnitWalkDirection = function(unit) {
    if (!unit.PrevPosition || !unit.CurrentPosition) {
      return false;
    }

    var turnSteps = [unit.PrevPosition, unit.CurrentPosition];
    var x = turnSteps[0].Col - turnSteps[1].Col;
    var y = turnSteps[0].Row - turnSteps[1].Row;

    if (x !== 0) {
      return (x > 0) ? 'left' : 'right';
    } else if (y !== 0) {
      return (y > 0) ? 'top' : 'bottom';
    }

    return false;
  };

  proto.animateMonstersCombining = function(monster) {
    if (monster.deleted && monster.element.isConnected) {
      var el = document.createElement('div');
      el.className = 'wappo-monsters-combining';
      var cellElement = monster.CurrentPosition.element;
      cellElement.appendChild(el);

      monster.element.remove();
    } else if (monster.Power === 3) {
      monster.element.classList.add('wappo-game-obj-enemy-power-3');
    }
  };

  proto.animateMonsterTrapped = function(monster) {
    var el = monster.element;
    var classPrefix = 'wappo-game-obj-enemy-trapped-turns-';
    el.classList.remove(classPrefix + (monster.SkipTurns + 1));
    if (monster.SkipTurns) {
      el.classList.add('wappo-game-obj-enemy-trapped', classPrefix + monster.SkipTurns);
    } else {
      el.classList.remove('wappo-game-obj-enemy-trapped');
    }
  };

  proto.animateHeroBeaten = function(hero) {
    var timeoutId = setTimeout(function() {
      var el = document.createElement('div');
      el.className = 'wappo-hero-lose';
      var cellElement = hero.CurrentPosition.element;
      cellElement.appendChild(el);
    }, this.walkAnimationDuration / 4);

    this.timeoutIds.push(timeoutId);
  };

  proto.animateHeroTrapped = function(hero) {
    var timeoutId = setTimeout(function() {
      hero.element.classList.add('wappo-hero-lose-trapped');
    }, this.walkAnimationDuration / 4);

    this.timeoutIds.push(timeoutId);
  };

  proto.afterAnimateTurn = function(nextTurnAvailable) {
    for (var i = 0; i < this.game.monsters.length; i++) {
      var monster = this.game.monsters[i];
      this.animateMonstersCombining(monster);
      this.animateMonsterTrapped(monster);
    }
  };

  proto.animateTurn = function(nextTurnAvailable, onsuccess) {
    var _this = this;

    // monsters + hero
    var animationsInQueue = this.game.monsters.length + 1;
    var success = function() {
      animationsInQueue--;
      if (animationsInQueue < 1) {
        _this.afterAnimateTurn(nextTurnAvailable);
        onsuccess();
      }
    };

    if (nextTurnAvailable === 'win') {
      this.gameField.classList.add('wappo-win');
    } else if (nextTurnAvailable === 'lose') {
      this.gameField.classList.add('wappo-lose');
      this.animateHeroBeaten(this.game.hero);
    } else if (nextTurnAvailable === 'lose-trapped') {
      this.gameField.classList.add('wappo-lose');
      this.animateHeroTrapped(this.game.hero);
    }

    this.animateWalk(this.game.hero, success);

    for (var i = 0; i < this.game.monsters.length; i++) {
      var monster = this.game.monsters[i];
      this.animateWalk(monster, success);
    }
  };

  /**
   * @param {DOMElement|string} container
   */
  proto.init = function(container, options) {
    if (typeof container === 'string') {
      container = document.getElementById(container) || document.querySelector(container);
    }

    if (!container) {
      throw 'container is not defined';
    }

    var controlsContainer = document.createElement('div');
    controlsContainer.className = 'wappo-controls';
    container.appendChild(controlsContainer);
    this.controlsContainer = controlsContainer;

    var gameField = document.createElement('div');
    gameField.className = 'wappo-game-field';
    container.appendChild(gameField);
    this.gameField = gameField;

    this.levels = Wappo.Levels.GetAllLevels();

    this.InitControls();
    this.LoadLevel(options.levelNumber || 0);

    var firstCell = gameField.querySelector('.wappo-game-cell');
    if (firstCell) {
      var cellWidth = firstCell.getBoundingClientRect().width;
      if (cellWidth) {
        this.moveDistance = cellWidth;
      }
    }
  };

  proto.InitControls = function() {
    var _this = this;

    var gameTitleCtrl = document.createElement('div');
    gameTitleCtrl.className = "wappo-game-title";
    gameTitleCtrl.innerHTML = "Wappo";
    this.controlsContainer.appendChild(gameTitleCtrl);

    var restartLevelCtrl = document.createElement('button');
    restartLevelCtrl.className = "wappo-game-restart-level";
    restartLevelCtrl.innerHTML = "&#8634;";
    restartLevelCtrl.onclick = function() {
      _this.LoadLevel(_this.currentLevel.Number);
    };
    this.controlsContainer.appendChild(restartLevelCtrl);

    var prevLevelCtrl = this.prevLevelCtrl = document.createElement('button');
    prevLevelCtrl.className = "wappo-game-prev-level";
    prevLevelCtrl.innerHTML = "&#8678;";
    prevLevelCtrl.onclick = function() {
      var numberPrevLevel = _this.currentLevel.Number - 1;
      if (numberPrevLevel >= 0 && numberPrevLevel <= _this.maxLevelNumberDiscovered) {
        _this.LoadLevel(numberPrevLevel);
      }
    };
    this.controlsContainer.appendChild(prevLevelCtrl);

    var levelTitleCtrl = this.levelTitleCtrl = document.createElement('div');
    levelTitleCtrl.className = "wappo-game-level-title";
    levelTitleCtrl.innerHTML = "[Level Title]";
    this.controlsContainer.appendChild(levelTitleCtrl);

    var nextLevelCtrl = this.nextLevelCtrl = document.createElement('button');
    nextLevelCtrl.className = "wappo-game-next-level";
    nextLevelCtrl.innerHTML = "&#8680;";
    nextLevelCtrl.onclick = function() {
      var numberNextLevel = _this.currentLevel.Number + 1;
      if (numberNextLevel < _this.levels.length && numberNextLevel <= _this.maxLevelNumberDiscovered) {
        _this.LoadLevel(numberNextLevel);
      }
    };
    this.controlsContainer.appendChild(nextLevelCtrl);

    var levelEmojiCode = this.levelEmojiCode = document.createElement('span')
    levelEmojiCode.className = "wappo-game-level-emoji-code";
    this.controlsContainer.appendChild(levelEmojiCode);
  };

  proto.RenderLevel = function() {
    this.gameField.innerHTML = "";
    this.gameField.classList.remove('wappo-animating', 'wappo-lose', 'wappo-win');

    var cells = this.currentLevel.Cells;
    var home = this.currentLevel.CellOuterHome;
    if (home && home.Row === -1) {
      var row = new Array(cells[0].length);
      row[home.Col] = home;
      cells.unshift(row);
    }

    if (home && home.Row === cells.length) {
      var row = new Array(cells[0].length);
      row[home.Col] = home;
      cells.push(row);
    }

    if (home && home.Col === -1) {
      var col = new Array(cells.length);
      col[home.Row] = home;
      for (var i = 0; i < cells.length; i++) {
        cells[i].unshift(col[i]);
      }
    }

    var outerCol = cells[0].length;
    if (home && home.Col === outerCol) {
      var col = new Array(cells.length);
      col[home.Row] = home;
      for (var i = 0; i < cells.length; i++) {
        cells[i].push(col[i]);
      }
    }

    for (var i = 0; i < cells.length; i++) {
      var row = document.createElement('div');
      row.className = 'wappo-game-row';
      this.gameField.appendChild(row);
      for (var j = 0; j < cells[i].length; j++) {
        var cell = cells[i][j];
        if (cell) {
          cell.rowIndex = i;
          cell.colIndex = j;
        }

        this._drawCell.call(this, cell, row);
      }
    }
  };

  /**
   * Загрузить новый уровень.
   * @param {number} levelNumber номер уровня, который необходимо загрузить.
   */
  proto.LoadLevel = function(levelNumber) {
    this.animating = false;

    if (levelNumber >= this.levels.length) {
      this.renderTheEnd();
      return;
    }

    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];

    if (levelNumber > this.maxLevelNumberDiscovered) {
      this.maxLevelNumberDiscovered = levelNumber;
    }

    var level = this.levels[levelNumber];

    this.game = new Wappo.Game();
    this.currentLevel = new Wappo.Level(level, levelNumber, this.game);
    this.game.cells = this.currentLevel.Cells;

    this.levelTitleCtrl.innerHTML = "Level " + (levelNumber + 1);
    this.prevLevelCtrl.disabled = levelNumber <= 0;
    this.nextLevelCtrl.disabled = levelNumber >= this.maxLevelNumberDiscovered;

    var levelEmojiCode = this.getLevelEmojiCode(level, levelNumber);
    this.levelEmojiCode.innerText = levelEmojiCode;
    this.levelEmojiCode.title = 'This is the emoji code for Level ' + (levelNumber + 1)
      + '.\nIn case you want to restore your game progress in other browser or computer:'
      + '\n  1. Open the game'
      + '\n  2. Press Ctrl+G'
      + '\n  3. Enter level number (' + (levelNumber + 1) + ')'
      + '\n  4. Paste the emoji code (' + levelEmojiCode + ')';

    this.RenderLevel();
    this.renderCongrats('Level ' + (levelNumber + 1) + ' passed!', false);
  };

  proto.getStringHashCode = function(str) {
    var hash = 0;
    if (str.length === 0) {
      return hash;
    }

    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }

    return Math.abs(hash);
  };

  proto.getLevelEmojiCode = function(level, levelNumber) {
    var hashCode = this.getStringHashCode(JSON.stringify(level));
    var emojis = this._emojis;
    var e1 = emojis[hashCode % emojis.length];
    var e2 = emojis[(hashCode * levelNumber) % emojis.length];
    var e3 = emojis[Math.abs(hashCode << 3) % emojis.length];
    return e1 + e2 + e3;
  };

  proto.renderCongrats = function(message, isVisible) {
    var className = 'wappo-game-congrats';
    var congratsCtrl = document.querySelector('.' + className);
    if (!congratsCtrl) {
      congratsCtrl = document.createElement('div');
      congratsCtrl.className = className;
      this.gameField.appendChild(congratsCtrl);
    }

    congratsCtrl.innerHTML = "<div><div class='wappo-game-congrats-bonfire'></div>"
      + "<div class='wappo-game-congrats-hero'></div></div>"
      + "<span>" + message + "</span>";

    if (isVisible) {
      this.gameField.classList.add('wappo-win');
    }

    return congratsCtrl;
  };

  proto.renderTheEnd = function() {
    if (!this.currentLevel) {
      this.LoadLevel(this.levels.length - 1);
      this.game.gameOver = true;
    }

    this.renderCongrats('The End!', true);
  };

  proto._displayObject = function(cell, objName, unit) {
    var el = cell.element;
    if (unit) {
      var objEl = document.createElement('div');
      objEl.className += ' wappo-game-obj wappo-is-game-obj-unit wappo-game-obj-' + objName;
      if (unit.walkDirection) {
        objEl.className += ' wappo-walk-direction-' + unit.walkDirection;
      }
      el.appendChild(objEl);
      unit.element = objEl;
    } else {
      var objEl = document.createElement('div');
      objEl.className = 'wappo-game-obj wappo-is-game-obj-static wappo-game-obj-' + objName;
      el.appendChild(objEl);
    }
  };

  proto.turn = function(cell, success) {
    if (!this.animating) {
      // Level was restarted during turn animation.
      return;
    }

    var _this = this;
    var nextTurnAvailable = this.game.turn(cell);

    this.animateTurn(nextTurnAvailable, function() {
      switch (nextTurnAvailable) {
        case true:
          _this.turn(cell, function() {
            success();
          });
          break;

        case false:
          success();
          break;

        case 'lose':
        case 'lose-trapped':
          _this.animateTurn(nextTurnAvailable, function() {
            if (!_this.animating) {
              // Level was restarted during turn animation.
              return;
            }

            var timeoutId = setTimeout(function() {
              _this.LoadLevel(_this.currentLevel.Number);
              success();
            }, _this.gameoverLoseDelay);
            _this.timeoutIds.push(timeoutId);
          });
          break;

        case 'win':
          var onLevelComplete = _this.onLevelComplete;
          if (onLevelComplete) {
            onLevelComplete.call(_this, _this.currentLevel.Number);
          }

          _this.animateTurn(nextTurnAvailable, function() {
            if (!_this.animating) {
              // Level was restarted during turn animation.
              return;
            }

            var timeoutId = setTimeout(function() {
              var numberNextLevel = _this.currentLevel.Number + 1;
              _this.LoadLevel(numberNextLevel);
              success();
            }, _this.gameoverWinDelay);
            _this.timeoutIds.push(timeoutId);
          });

          break;

        default:
          throw 'Invalid value of nextTurnAvailable: ' + nextTurnAvailable
      }
    });
  };

  proto.turnAction = function(cell) {
    if (this.animating) {
      return;
    }

    this.animating = true;
    this.gameField.classList.add('wappo-animating');

    var _this = this;
    this.turn(cell, function() {
      _this.animating = false;
      _this.gameField.classList.remove('wappo-animating');
    });
  };

  proto._drawCell = function(cell, rowElement) {
    if (!cell) {
      var cellElem = document.createElement('div');
      cellElem.className = 'wappo-game-cell wappo-empty-cell';
      rowElement.appendChild(cellElem);
      return;
    }

    var cellElem = document.createElement('div');
    cellElem.className = 'wappo-game-cell';

    var _this = this;
    cellElem.onclick = function() {
      _this.turnAction(cell);
    };

    rowElement.appendChild(cellElem);
    cell.element = cellElem;

    // Нанесение декораций внутри ячейки.
    // Берем случайное число из интервала 1..20.
    // Вероятность наличия декорации в ячейке - decorSpritesCount\20
    var decorNumber = Math.floor((Math.random() * 20) + 1);
    var decorSpritesCount = 6; // количество спрайтов в изображении.
    if (decorNumber <= decorSpritesCount) {
      var decorEl = document.createElement('div');
      decorEl.className = 'wappo-decor wappo-decor-' + decorNumber;
      cellElem.appendChild(decorEl);
    }

    if (cell.RightWall) {
      var rightWallEl = document.createElement('div');
      rightWallEl.className = 'wappo-wall wappo-right-wall';
      cellElem.appendChild(rightWallEl);
    }

    if (cell.BottomWall) {
      var bottomWallEl = document.createElement('div');
      bottomWallEl.className = 'wappo-wall wappo-bottom-wall';
      cellElem.appendChild(bottomWallEl);
    }

    // Рендеринг основного содержимого ячейки.
    if (cell.Place instanceof Wappo.Trap) {
      this._displayObject(cell, 'trap', null);
    } else if (cell.Place instanceof Wappo.Home) {
      this._displayObject(cell, 'house');
    }

    this._drawUnitCell(cell);
  };

  proto._drawUnitCell = function(cell) {
    if (cell.Unit instanceof Wappo.Hero) {
      this._displayObject(cell, 'hero', cell.Unit);
    } else if (cell.Unit instanceof Wappo.Monster) {
      switch (cell.Unit.Power) {
        case 2:
          // рисуем монстра с силой 1.
          var objName = (cell.Unit.SkipTurns == 0)
            ? 'enemy'
            : 'enemy wappo-game-obj-enemy-trapped';
          this._displayObject(cell, objName, cell.Unit);
          break;
        case 3:
          // рисуем монстра с силой 2.
          this._displayObject(cell, 'enemy wappo-game-obj-enemy-power-3', cell.Unit);
          break;
      }
    }
  };

  proto._emojis = [
    '😄','😃','😀','😊','☺','😉','😍','😘','😚','😗','😙','😜','😝','😛','😳','😁','😔','😌','😒','😞','😣','😢','😂','😭','😪','😥','😰','😅','😓','😩','😫','😨','😱','😠','😡','😤','😖','😆','😋','😷','😎','😴','😵','😲','😟','😦','😧','😈','👿','😮','😬','😐','😕','😯','😶','😇','😏','😑','👲','👳','👮','👷','💂','👶','👦','👧','👨','👩','👴','👵','👱','👼','👸','😺','😸','😻','😽','😼','🙀','😿','😹','😾','👹','👺','🙈','🙉','🙊','💀','👽','💩','🔥','✨','🌟','💫','💥','💢','💦','💧','💤','💨','👂','👀','👃','👅','👄','👍','👎','👌','👊','✊','✌','👋','✋','👐','👆','👇','👉','👈','🙌','🙏','☝','👏','💪','🚶','🏃','💃','👫','👪','👬','👭','💏','💑','👯','🙆','🙅','💁','🙋','💆','💇','💅','👰','🙎','🙍','🙇','🎩','👑','👒','👟','👞','👡','👠','👢','👕','👔','👚','👗','🎽','👖','👘','👙','💼','👜','👝','👛','👓','🎀','🌂','💄','💛','💙','💜','💚','❤','💔','💗','💓','💕','💖','💞','💘','💌','💋','💍','💎','👤','👥','💬','👣','💭','🐶','🐺','🐱','🐭','🐹','🐰','🐸','🐯','🐨','🐻','🐷','🐽','🐮','🐗','🐵','🐒','🐴','🐑','🐘','🐼','🐧','🐦','🐤','🐥','🐣','🐔','🐍','🐢','🐛','🐝','🐜','🐞','🐌','🐙','🐚','🐠','🐟','🐬','🐳','🐋','🐄','🐏','🐀','🐃','🐅','🐇','🐉','🐎','🐐','🐓','🐕','🐖','🐁','🐂','🐲','🐡','🐊','🐫','🐪','🐆','🐈','🐩','🐾','💐','🌸','🌷','🍀','🌹','🌻','🌺','🍁','🍃','🍂','🌿','🌾','🍄','🌵','🌴','🌲','🌳','🌰','🌱','🌼','🌐','🌞','🌝','🌚','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌜','🌛','🌙','🌍','🌎','🌏','🌋','🌌','🌠','⭐','☀','⛅','☁','⚡','☔','❄','⛄','🌀','🌁','🌈','🌊','🎍','💝','🎎','🎒','🎓','🎏','🎆','🎇','🎐','🎑','🎃','👻','🎅','🎄','🎁','🎋','🎉','🎊','🎈','🎌','🔮','🎥','📷','📹','📼','💿','📀','💽','💾','💻','📱','☎','📞','📟','📠','📡','📺','📻','🔊','🔉','🔈','🔇','🔔','🔕','📢','📣','⏳','⌛','⏰','⌚','🔓','🔒','🔏','🔐','🔑','🔎','💡','🔦','🔆','🔅','🔌','🔋','🔍','🛁','🛀','🚿','🚽','🔧','🔩','🔨','🚪','🚬','💣','🔫','🔪','💊','💉','💰','💴','💵','💷','💶','💳','💸','📲','📧','📥','📤','✉','📩','📨','📯','📫','📪','📬','📭','📮','📦','📝','📄','📃','📑','📊','📈','📉','📜','📋','📅','📆','📇','📁','📂','✂','📌','📎','✒','✏','📏','📐','📕','📗','📘','📙','📓','📔','📒','📚','📖','🔖','📛','🔬','🔭','📰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🎻','🎺','🎷','🎸','👾','🎮','🃏','🎴','🀄','🎲','🎯','🏈','🏀','⚽','⚾','🎾','🎱','🏉','🎳','⛳','🚵','🚴','🏁','🏇','🏆','🎿','🏂','🏊','🏄','🎣','☕','🍵','🍶','🍼','🍺','🍻','🍸','🍹','🍷','🍴','🍕','🍔','🍟','🍗','🍖','🍝','🍛','🍤','🍱','🍣','🍥','🍙','🍘','🍚','🍜','🍲','🍢','🍡','🍳','🍞','🍩','🍮','🍦','🍨','🍧','🎂','🍰','🍪','🍫','🍬','🍭','🍯','🍎','🍏','🍊','🍋','🍒','🍇','🍉','🍓','🍑','🍈','🍌','🍐','🍍','🍠','🍆','🍅','🌽','🏠','🏡','🏫','🏢','🏣','🏥','🏦','🏪','🏩','🏨','💒','⛪','🏬','🏤','🌇','🌆','🏯','🏰','⛺','🏭','🗼','🗾','🗻','🌄','🌅','🌃','🗽','🌉','🎠','🎡','⛲','🎢','🚢','⛵','🚤','🚣','⚓','🚀','✈','💺','🚁','🚂','🚊','🚉','🚞','🚆','🚄','🚅','🚈','🚇','🚝','🚋','🚃','🚎','🚌','🚍','🚙','🚘','🚗','🚕','🚖','🚛','🚚','🚨','🚓','🚔','🚒','🚑','🚐','🚲','🚡','🚟','🚠','🚜','💈','🚏','🎫','🚦','🚥','⚠','🚧','🔰','⛽','🏮','🎰','♨','🗿','🎪','🎭','📍','🚩','⬆','⬇','⬅','➡','🔠','🔡','🔤','↗','↖','↘','↙','↔','↕','🔄','◀','▶','🔼','🔽','↩','↪','ℹ','⏪','⏩','⏫','⏬','⤵','⤴','🆗','🔀','🔁','🔂','🆕','🆙','🆒','🆓','🆖','📶','🎦','🈁','🈯','🈳','🈵','🈴','🈲','🉐','🈹','🈺','🈶','🈚','🚻','🚹','🚺','🚼','🚾','🚰','🚮','🅿','♿','🚭','🈷','🈸','🈂','Ⓜ','🛂','🛄','🛅','🛃','🉑','㊙','㊗','🆑','🆘','🆔','🚫','🔞','📵','🚯','🚱','🚳','🚷','🚸','⛔','✳','❇','❎','✅','✴','💟','🆚','📳','📴','🅰','🅱','🆎','🅾','💠','➿','♻','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','⛎','🔯','🏧','💹','💲','💱','©','®','™','〽','〰','🔝','🔚','🔙','🔛','🔜','❌','⭕','❗','❓','❕','❔','🔃','🕛','🕧','🕐','🕜','🕑','🕝','🕒','🕞','🕓','🕟','🕔','🕠','🕕','🕖','🕗','🕘','🕙','🕚','🕡','🕢','🕣','🕤','🕥','🕦','✖','➕','➖','➗','♠','♥','♣','♦','💮','💯','✔','☑','🔘','🔗','➰','🔱','🔲','🔳','◼','◻','◾','◽','▪','▫','🔺','⬜','⬛','⚫','⚪','🔴','🔵','🔻','🔶','🔷','🔸','🔹'
  ];
})();
