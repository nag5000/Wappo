Wappo.Level = function(level, levelNumber, game) {
  this.Number = levelNumber;
  this.Cells = [];
  this.CellOuterHome = undefined;

  var home = level['home'];
  var field = level['field'];

  var countCellsInCol = (field.length + 1) / 2;
  var countCellsInRow = (field[0].length + 1) / 2;

  for (var i = 0; i < countCellsInCol; i++) {
    this.Cells[i] = [];
    for (var j = 0; j < countCellsInRow; j++) {
      var value = field[i * 2][j * 2];
      var newCell = new Wappo.Cell(i, j);

      switch (value) {
        case Wappo.Levels.Trap:
          newCell.Place = new Wappo.Trap(newCell);
          break;

        case Wappo.Levels.Home:
          newCell.Place = new Wappo.Home(newCell);
          break;

        case Wappo.Levels.Hero:
          newCell.Unit = new Wappo.Hero(newCell);
          game.hero = newCell.Unit;
          break;

        case Wappo.Levels.Monster:
          newCell.Unit = new Wappo.Monster(newCell);
          game.monsters.push(newCell.Unit);
          break;

        case Wappo.Levels.MonsterOnTrap:
          newCell.Unit = new Wappo.Monster(newCell);
          newCell.Place = new Wappo.Trap(newCell);
          game.monsters.push(newCell.Unit);
          break;

        case Wappo.Levels.MonsterOnHome:
          newCell.Unit = new Wappo.Monster(newCell);
          newCell.Place = new Wappo.Home(newCell);
          game.monsters.push(newCell.Unit);
          break;

        default:
          // Empty cell.
          break;
      }

      this.Cells[i][j] = newCell;
    }
  }

  if (home[0] < 0 || home[1] < 0 || home[0] >= countCellsInCol || home[1] >= countCellsInRow) {
    this.CellOuterHome = new Wappo.Cell(home[0], home[1]);
    this.CellOuterHome.Place = new Wappo.Home(this.CellOuterHome);
  }

  for (i = 0; i < field.length; i++) {
    for (j = 0; j < field[i].length; j++) {
      // Если это нечетная строчка, то стенки на четных позициях.
      // Если четная строчка, то стенки на нечетных позициях.
      // Проверка при делении по модулю 2 перевернута из-за того что индексы идут с 0.

      if (i % 2 == 0 && j % 2 == 1 && field[i][j] == 1) {
        this.Cells[i / 2][j / 2 - 1 / 2].RightWall = true;

        if (j != field[i].length - 1)
          this.Cells[i / 2][j / 2 + 1 / 2].LeftWall = true;
      } else if (i % 2 == 1 && j % 2 == 0 && field[i][j] == 1) {
        this.Cells[i / 2 - 1 / 2][j / 2].BottomWall = true;

        if (i != field.length - 1)
          this.Cells[i / 2 + 1 / 2][j / 2].TopWall = true;
      }
    }
  }
}
