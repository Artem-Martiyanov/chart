import {Graph} from './plugins/graph/index.js'

const settings = {
  width: 1000,
  height: 600,
  fieldOffset: 50,    // Смещение графика для эффекта выхода за границы, px
  indentToActiveArea: 15, // смещение от минимальной и максимальной точки графика до низа и верха, %
  chartLineColor: '#00bbcc',
  userChartLineColor: '#ff9922',
  hiddenChartLineColor: '#ff4444',
  chartLineWidth: 7,
  chartBackgroundColor: 'rgba(0, 0, 0, 0.1)',
  chartBackgroundLineColor: '#ffffff',
  chartBackgroundLineWidth: 2.5,
  shadowColors: ['rgba(164,164,164,0.35)', 'rgba(110,110,110,0.35)'],
  xSignInterval: 4,
  xDataMask: '\'x',
  drawingSpeed: 3,
  signXTextSize: 34,
  groupNamesSize: 34,
}

const dataSet = [
  {
    name: 'Путин',
    dataSet: [
      {x: 0, y: 112.173},
      {x: 1, y: 120},
      {x: 2, y: 142},
      {x: 3, y: 153},
      {x: 4, y: 168},
      {x: 5, y: 185},
      {x: 6, y: 190},
      {x: 7, y: 199},
      {x: 8, y: 201},
    ]
  },
  {
    name: 'Медведев',
    dataSet: [
      {x: 9, y: 207},
      {x: 10, y: 230},
      {x: 11, y: 250},
      {x: 12, y: 290},
    ]
  },
  {
    name: 'Путин',
    dataSet: [
      {x: 13, y: 280},
      {x: 14, y: 300},
      {x: 15, y: 311},
      {x: 16, y: 298},
      {x: 17, y: 252.3},
    ]
  }
]
const dataSet2 = [
  {
    name: 'Путин',
    dataSet: [
      {x: 0, y: 0.1},
      {x: 1, y: 0.9},
      {x: 2, y: 1.5},
      {x: 3, y: 1},
      {x: 4, y: 0.9},
    ]
  },
  {
    name: 'Медведев',
    dataSet: [
      {x: 5, y: 2},
      {x: 6, y: 2.1},
      {x: 7, y: 2},
      {x: 8, y: 1},
    ]
  },
  {
    name: 'Путин',
    dataSet: [
      {x: 9, y: 1.2},
      {x: 10, y: 1.5},
      {x: 11, y: 1.8},
      {x: 12, y: 2},
      {x: 13, y: 1.8},
    ]
  }
]

const myChart = new Graph(settings, dataSet, 'my-chart')
const myChart2 = new Graph(settings, dataSet2, 'my-chart-2')

let flag = false
let flag2 = false
myChart.onDrawn(() => {
  flag = true
})
myChart2.onDrawn(() => {
  flag2 = true
})


document.addEventListener('pointerdown', (event) => {
  if (event.target.dataset.chart === 'my-chart-button') {
    if (flag) {
      myChart.drawHiddenChart((result) => {
        const resultDiv = document.querySelector('.result')
        resultDiv.textContent = 'Разница: ' + result + '%'
      })
    }
  }
  
  if (event.target.dataset.chart === 'my-chart-button-2') {
    if (flag2) {
      myChart2.drawHiddenChart((result) => {
        const resultDiv = document.querySelector('.result-2')
        resultDiv.textContent = 'Разница: ' + result + '%'
      })
    }
  }
})
