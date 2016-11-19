(function() {
  var Wappo = window.Wappo = {};

  Wappo.Cell = function(row, col) {
    this.Width = 50; // Ширина.
    this.Height = 50; // Высота.
    this.Row = row; // Номер строки ячейки в матрице.
    this.Col = col; // Номер столбца ячейки в матрице.
    this.RightWall = false; // Есть ли стенка справа.
    this.BottomWall = false; // Есть ли стенка снизу.
    this.LeftWall = false; // Есть ли стенка слева.
    this.TopWall = false; // Есть ли стенка сверху.
    this.Unit = undefined; // Юнит находящейся в ячейке (монстр или герой).
    this.Place = undefined; // Что расположено в ячейке (ловушка или дом).
  }

  Wappo.Home = function(cell) {
    this.CurrentPosition = cell;
  }

  Wappo.Trap = function(cell) {
    this.CurrentPosition = cell;
  }

  Wappo.Hero = function(cell) {
    this.CurrentPosition = cell;
  }

  Wappo.Monster = function(cell) {
    this.CurrentPosition = cell; // Текущая ячейка в которой находится монстр.
    this.Power = 2; // Сила монстра которая определяет максимальное колличство шагов за раз.
    this.Steps = 2; // Текущее количество оставшихся шагов.
    this.SkipTurns = 0; // Количество ходов которые пропустит монстр.
    this.SkipTurnsEnabled = true; // Будет ли монст пропускать ходы если попадет в ловушку.
  }

  Wappo.Monster.prototype.SetPower = function(power) {
    if (this.Power < 3) {
      // Если монстр набирает силу больше двух, то его не остановить в ловушке.
      this.SkipTurnsEnabled = false;
    }

    this.Power = power;
  }
})();
