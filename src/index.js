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
