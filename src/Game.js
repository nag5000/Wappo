(function() {
  Wappo.Game = Game;
  var proto = Game.prototype;

  function Game() {
    this.gameOver = false;
    this.monsters = [];
    this.hero = null;
    this.firstTurnCompleted = false;
    this.cells = null;
  }

  proto.turn = function(cell) {
    if (!this.firstTurnCompleted) {
      var nextTurnAvailable = this.turnHero(cell);
      this.firstTurnCompleted = nextTurnAvailable !== false;
      return nextTurnAvailable;
    }

    var nextTurnAvailable = this.turnMonsters();
    if (!nextTurnAvailable) {
      // После того как все отходили, проставляем их ходы обратно.
      // Для попавших в ловушку уменьшаем время простоя.
      for (var i = 0; i < this.monsters.length; i++) {
        var monster = this.monsters[i];
        monster.Steps = monster.Power;
        if (monster.SkipTurns > 0)
          monster.SkipTurns--;
      }

      this.firstTurnCompleted = false;
    }

    return nextTurnAvailable;
  };

  proto.turnHero = function(cell) {
    if (!cell || this.gameOver) {
      return false;
    }

    var currentCell = this.hero.CurrentPosition;

    if (currentCell === cell) {
      return false;
    }

    if (cell.Row - currentCell.Row == 1 && cell.Col - currentCell.Col == 0 && !currentCell.BottomWall ||
      cell.Row - currentCell.Row == -1 && cell.Col - currentCell.Col == 0 && !currentCell.TopWall ||
      cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == 1 && !currentCell.RightWall ||
      cell.Row - currentCell.Row == 0 && cell.Col - currentCell.Col == -1 && !currentCell.LeftWall) {

      var gameOverType;
      if (cell.Place instanceof Wappo.Trap) {
        gameOverType = 'lose-trapped';
      } else if (cell.Unit instanceof Wappo.Monster) {
        gameOverType = 'lose';
      } else if (cell.Place instanceof Wappo.Home) {
        gameOverType = 'win';
      }

      cell.Unit = this.hero;
      currentCell.Unit = undefined;
      this.hero.PrevPosition = this.hero.CurrentPosition;
      this.hero.CurrentPosition = cell;

      if (gameOverType) {
        this.gameOver = true;
        return gameOverType;
      }

      return true;
    }

    return false;
  };

  /**
   * One turn (if available) for each monster.
   */
  proto.turnMonsters = function() {
    if (this.gameOver) {
      return false;
    }

    var _this = this;

    // Получить индекс монстра в массиве, который стоит на указаной позиции.
    var getMonsterIndexByPosition = function(positionCell) {
      for (var i = 0; i < _this.monsters.length; i++) {
        var deleted = false;
        for (var j = 0; j < monstersForDelete.length; j++) {
          if (monstersForDelete[j] === i) {
            deleted = true;
            break;
          }
        }

        if (!deleted && _this.monsters[i].CurrentPosition.Col == positionCell.Col &&
          _this.monsters[i].CurrentPosition.Row == positionCell.Row)
          return i;
      }

      return undefined;
    };

    var turnComplete = true;

    // Массив индексов монстров для удаления. Необходим при соединении монстров.
    var monstersForDelete = [];

    // true, если пользователь проиграл (монстр догнал героя).
    var lose = false;

    this.monsters = this.monsters.filter(function(monster) {
      return !monster.deleted;
    });

    // Перебираем всех монстров и пытаемся сделать ход.
    for (var i = 0; i < this.monsters.length; i++) {
      var monster = this.monsters[i];
      if (monster.deleted) {
        continue;
      }

      var nextCell = this.getNextCellForMonster(monster);
      var index = i + 1;

      // Сортируем массив монстров. Сортировка необходима для избежания конфликтов.
      // Так как монстры должны ходить синхронно, а мы вынуждены писать асинхронный алгоритм,
      // то для разрешения ситуации, когда монстр хочет встать в ячейку с другим монстром,
      // который ещё не успел сделать шаг, необходима сортировка.
      // Так как монстры не могут идти в разные стороны, то циклов быть не может.
      while (nextCell.Unit instanceof Wappo.Monster) {
        index = getMonsterIndexByPosition(nextCell);

        if (index > i) {
          this.monsters[i] = this.monsters[index];
          this.monsters[index] = monster;
          monster = this.monsters[i];
          nextCell = this.getNextCellForMonster(monster);
        } else {
          break;
        }
      }

      if (monster.Steps > 0 && monster.SkipTurns == 0 &&
        // Если монстр уже стоит на ловушке и пытается в неё же сходить, то он останется на месте.
        (nextCell !== monster.CurrentPosition || !monster.CurrentPosition.Place instanceof Wappo.Trap)) {

        // Передвигаем монстра в новую ячейку.
        monster.CurrentPosition.Unit = undefined;
        monster.PrevPosition = monster.CurrentPosition;
        monster.CurrentPosition = nextCell;

        // Если в новой ячейке уже стоял монстр, то объединяем их.
        if (nextCell.Unit instanceof Wappo.Monster) {
          nextCell.MonsterPower = 3;
          monster.SetPower(3);
          monster.Steps = 0;
          monster.SkipTurns = 0;

          var anotherMonsterIndex = getMonsterIndexByPosition(nextCell);
          var anotherMonster = this.monsters[anotherMonsterIndex];
          anotherMonster.SetPower(3);

          monstersForDelete.push(anotherMonsterIndex);
        } else {
          if (nextCell.Unit instanceof Wappo.Hero) {
            // Пользователь проиграл, когда монстр попал в клетку с героем.
            lose = true;
          } else if (nextCell.Place instanceof Wappo.Trap && monster.SkipTurnsEnabled) {
            // Монстр пропускает 3 хода + текущий.
            monster.SkipTurns = 4;
          }

          nextCell.Unit = monster;
        }

        monster.Steps--;

        // Если после сделанного шага остались ещё шаги, то цикл будет продолжен.
        if (monster.Steps > 0) {
          turnComplete = false;
        }
      }
    }

    // Отметим лишних монстров - это нужно, если они соеденились.
    // После перерисовки игрового поля их нужно будет удалить.
    monstersForDelete.sort(function(a, b) {
      return b - a;
    });
    for (i = 0; i < monstersForDelete.length; i++) {
      // Проверяем, чтобы не было совпадений, а то удалятся нужные монстры.
      if (i == 0 || monstersForDelete[i] != monstersForDelete[i - 1])
        this.monsters[monstersForDelete[i]].deleted = true;
    }

    if (lose) {
      this.gameOver = true;
      return 'lose';
    }

    return !turnComplete;
  };

  proto.getNextCellForMonster = function(monster) {
    var cells = this.cells;

    var changeRow = function() {
      // Если герой ниже монстра, то монстр попытается спуститься.
      if (this.hero.CurrentPosition.Row > monster.CurrentPosition.Row) {
        // Если на пути у него стенка, то он останется на месте.
        if (cells[monster.CurrentPosition.Row + 1][monster.CurrentPosition.Col].TopWall) {
          return monster.CurrentPosition;
        }

        return cells[monster.CurrentPosition.Row + 1][monster.CurrentPosition.Col];
      } else {
        // Если на пути у него стенка, то он останется на месте.
        if (cells[monster.CurrentPosition.Row - 1][monster.CurrentPosition.Col].BottomWall) {
          return monster.CurrentPosition;
        }

        return cells[monster.CurrentPosition.Row - 1][monster.CurrentPosition.Col];
      }
    };

    var changeCol = function() {
      // Если герой правее монстра, то монстр попытается пройти в право.
      if (this.hero.CurrentPosition.Col > monster.CurrentPosition.Col) {
        // Если на пути у него стенка, то он останется на месте.
        if (cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col + 1].LeftWall)
          return monster.CurrentPosition;

        return cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col + 1];
      } else {
        // Если на пути у него стенка, то он останется на месте.
        if (cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col - 1].RightWall)
          return monster.CurrentPosition;

        return cells[monster.CurrentPosition.Row][monster.CurrentPosition.Col - 1];
      }
    };

    // Если они стоят в одном столбце, то монстр попытается пройти по вертикали.
    if (this.hero.CurrentPosition.Col == monster.CurrentPosition.Col) {
      return changeRow.call(this);
    }

    // Если монстр и герой не в одном столбце, то он постарается сначала приблизится к герою по горизонтали.
    var newCell = changeCol.call(this);
    if (newCell != monster.CurrentPosition) {
      return newCell;
    }

    // Если по горизонтали стенка, то он постарается сходить по вертикали, если он не стоит в одной с ним строке.
    if (this.hero.CurrentPosition.Row != monster.CurrentPosition.Row) {
      return changeRow.call(this);
    }

    return monster.CurrentPosition;
  };
})();
