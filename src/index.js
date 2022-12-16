(function() {
  /**
   * @param {DOMElement|string} container
   */
  Wappo.init = function(container) {
    var options = {
      levelNumber: loadLevelNumber(),
      onLevelComplete: function(levelNumber) {
        var nextLevelNumber = levelNumber + 1;
        if (nextLevelNumber > this.maxLevelNumberDiscovered) {
          saveLevelNumber(nextLevelNumber);
        }
      }
    };

    var gameWindow = new Wappo.GameWindow(container, options);

    document.onkeyup = function(e) {
      var game = gameWindow.game;
      if (!game) {
        return;
      }

      var cells = gameWindow.currentLevel.Cells;
      var pos = game.hero.CurrentPosition;
      var cell;
      switch (e.keyCode) {
        case 37: // left
          cell = cells[pos.Row][pos.Col - 1];
          break;

        case 39: // right
          cell = cells[pos.Row][pos.Col + 1];
          break;

        case 38: // up
          var row = cells[pos.Row - 1];
          cell = row && row[pos.Col];
          break;

        case 40: // down
          var row = cells[pos.Row + 1];
          cell = row && row[pos.Col];
          break;
      }

      if (cell) {
        gameWindow.turnAction(cell);
      }
    };

    document.addEventListener('keypress', function(e) {
      if (e.ctrlKey && e.code === "KeyG") {
        var levelNumber = prompt(
          'Restore game progress / Load locked level.\nEnter level number:',
          gameWindow.currentLevel.Number + 1
        );

        if (levelNumber == null) {
          return;
        }

        levelNumber = Number(levelNumber) - 1;
        if (!Number.isInteger(levelNumber)
            || levelNumber < 0
            || levelNumber >= gameWindow.levels.length) {
          alert('Incorrect level number.');
          return;
        }

        var level = gameWindow.levels[levelNumber];
        if (!level) {
          alert('Incorrect level number.');
          return;
        }

        var emojiCode = prompt(
          'Enter the emoji code for level ' + (levelNumber + 1) + ':',
          '🔶🔶🔶'
        );

        if (emojiCode == null) {
          return;
        }

        if (emojiCode !== gameWindow.getLevelEmojiCode(level, levelNumber)) {
          alert('Incorrect emoji code for level ' + (levelNumber + 1));
          return;
        }

        saveLevelNumber(levelNumber)
        gameWindow.LoadLevel(levelNumber);
      }
    });

    return gameWindow;
  };

  function loadLevelNumber() {
    try {
      var value = window.localStorage.getItem('wappo-level');
      return Number(value) || 0;
    } catch(e) {
      return 0;
    }
  }

  function saveLevelNumber(levelNumber) {
    try {
      window.localStorage.setItem('wappo-level', levelNumber);
    } catch(e) {
    }
  }
})();
