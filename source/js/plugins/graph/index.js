import {createCanvas} from './utils.js';

export class Graph {
  
  constructor(settings, data) {
    this.canvasWidth = settings.width
    this.canvasHeight = settings.height
    this.indentToActiveArea = settings.indentToActiveArea / 100
    
    this.startX = settings.fieldOffset                                                          // Точка отсчёта по X, включая отступ
    this.startY = this.canvasHeight - settings.fieldOffset                                      // Точка отсчёта по Y, включая отступ
    this.endX = this.canvasWidth - settings.fieldOffset                                         // Крайняя точка по X
    this.endY = settings.fieldOffset                                                            // Крайняя точка по Y
    this.fieldWidth = this.endX - this.startX                                                   // Ширина активной области
    this.fieldHeight = this.endY - this.startY                                                  // Высота активной области
    this.intervalsCount = data.reduce((acc, group) => acc + group.dataSet.length, 0) - 1        // Количество интервалов
    this.intervalWidth = this.fieldWidth / this.intervalsCount                                  // Ширина интервала
    this.mappingData = this.#mapData(data)                                                      // Адаптированные под размеры графика данные
    this.data = data                                                                            // Оригинальные данные
    this.xSignInterval = settings.xSignInterval || 2                                            // Интервал между подписями по оси X
    this.xDataMask = settings.xDataMask || 'x'                                                  // Маска, по которой будут отображаться данные на оси X
    this.settings = settings
    this.chartDifference = 0
    
    this.canvas = createCanvas(this.canvasWidth, this.canvasHeight)
    this.ctx = this.canvas.getContext('2d')
    
    this.wrapper = document.querySelector(`[data-chart="${settings.chartName}"]`)
    this.wrapper.insertAdjacentElement('beforeend', this.canvas)
    
    this.userDrowningChart = this.mappingData[this.mappingData.length - 1].dataSet.map(point => ({
      ...point,
      y: undefined
    }))
    this.userDrowningChart.splice(0, 0, this.mappingData[this.mappingData.length - 2].dataSet.slice(-1)[0])
    
    this.#drawChart(this.mappingData, settings)
    this.#drawCircles()
    
    this.canvas.addEventListener('pointerdown', this.#pointerDownHandler)
    
    this.drawnCallback = () => {
    }
  }
  
  onDrawn = (callback) => this.drawnCallback = callback
  
  
  /**
   @description Добавляет переданные точки в массив точек графика пользователя
   @param {number} pointerX - позиция указателя по X
   @param {number} pointerY - позиция указателя по Y
   */
  #addUserPointsToArray = (pointerX, pointerY) => {
    this.userDrowningChart.forEach((point, index, arr) => {
      if (index) {
        const isPointerInArea = (pointerX >= point.x - this.intervalWidth / 2) && (pointerX <= point.x + this.intervalWidth / 2)
        const isPermitted = pointerY <= this.canvasHeight - this.settings.fieldOffset && pointerY >= this.settings.fieldOffset
        if (isPointerInArea && arr[index - 1].y && isPermitted) {
          point.y = pointerY
        }
      }
    })
  }
  
  /**
   @description Считает разницу между оригинальным графиком и пользовательским
   @return {string}
   */
  #calculateDifference = () => {
    let originalDataSet = []
    
    this.mappingData.forEach((group, index, array) => {
      if (group.name === 'hidden') {
        originalDataSet.push(array[index - 1].dataSet[array[index - 1].dataSet.length - 1])
        originalDataSet = [...originalDataSet, ...group.dataSet]
      }
    })
    const calcShadowArea = (points) => points.reduce((acc, point, i, arr) => {
      if (i < arr.length - 1) {
        acc += (point.y + arr[i + 1].y) / 2 * this.intervalWidth
      }
      return acc
    }, 0)
    
    const originalChartArea = calcShadowArea(originalDataSet)
    const userChartArea = calcShadowArea(this.userDrowningChart)
    const absDifference = Math.abs(originalChartArea - userChartArea)
    return (absDifference / originalChartArea * 100).toFixed(2)
  }
  
  /**
   @description Обрабатывает движение указателя
   @param {object} event - событие движения указателя
   */
  #pointerMoveHandler = (event) => {
    const {x: pointerX, y: pointerY} = this.#calculatePointerPosition(event)
    
    // Устраняет застревание
    if (pointerX >= this.canvasWidth - 3 || pointerX <= 3 || pointerY >= this.canvasHeight - 3 || pointerY <= 3) {
      this.canvas.removeEventListener('pointermove', this.#pointerMoveHandler)
    }
    
    // добавляем в массив точки, которые прошёл указатель
    this.#addUserPointsToArray(pointerX, pointerY)
    
    // рисуем линию на основе точек из графика пользователя
    this.#clear()
    this.#drawCompleteChart()
    
    // вызываем колбек и передаем в него разницу пользовательского графика и оригинального
    this.chartDifference = this.#calculateDifference()
    if (!isNaN(this.chartDifference)) {
      this.drawnCallback()
    }
    
    // обновляем остальные кружки
    this.#drawCircles()
  }
  
  /**
   @description Рисует скрытую часть графика
   */
  drawHiddenChart = (then) => {
    const calcAngle = (point1, point2) => {
      const scalarProduct = (this.intervalWidth ** 2)
      const moduleFirstPoint = Math.sqrt(scalarProduct)
      const moduleSecondPoint = Math.sqrt(scalarProduct + ((point2.y - point1.y) ** 2))
      const cosAngle = scalarProduct / (moduleFirstPoint * moduleSecondPoint)
      return point2.y <= point1.y ? Math.acos(cosAngle) : Math.acos(cosAngle) * -1
    }
    const calcLineLength = (point1, point2) => {
      const yLeg = Math.abs(point2.y - point1.y)
      return Math.sqrt((yLeg ** 2) + (this.intervalWidth ** 2))
    }
    
    const getCoordinates = (point, angle, length) => {
      const newX = (Math.cos(angle) * length) + point.x
      const newY = ((Math.sin(angle) * length) - point.y) * -1
      return {x: newX, y: newY}
    }
    
    this.canvas.removeEventListener('pointerdown', this.#pointerDownHandler)
    
    let hiddenPoints = []
    
    // Получаем массив из скрытых точек + последнюю точку предыдущей группы
    this.mappingData.forEach((group, index, array) => {
      if (group.name === 'hidden') {
        hiddenPoints.push(array[index - 1].dataSet[array[index - 1].dataSet.length - 1])
        hiddenPoints = [...hiddenPoints, ...group.dataSet]
      }
    })
    
    // Записываем каждой точке, кроме последней, угол и длину до следующей точки и приращение
    hiddenPoints.forEach((point, index, array) => {
      if (index + 1 <= array.length - 1) {
        point.angle = calcAngle(point, array[index + 1])
        point.lineLength = calcLineLength(point, array[index + 1])
        point.increment = calcLineLength(point, array[index + 1]) / this.intervalWidth * this.settings.drawingSpeed
      }
    })
    
    const delay = 0
    let timeStart = 0
    let pointIndex = 0
    let prevLength = 0
    let curPoint = hiddenPoints[0]
    const pointsArray = [hiddenPoints[0]]
    
    this.ctx.beginPath()
    this.ctx.moveTo(curPoint.x, curPoint.y)
    const drawChart = (time) => {
      if (time - timeStart > delay) {
        // Проверяем, не нарисовался ли весь график
        if (pointIndex >= hiddenPoints.length - 1) {
          
          const endCircle = [
            this.mappingData.splice(-1)[0].dataSet.splice(-1)[0],
            this.settings.hiddenChartLineColor,
            12,
            {
              textContent: this.data.splice(-1)[0].dataSet.splice(-1)[0].y,
              textColor: '#000000',
              fontSize: '30',
              fontStyle: 'sans-serif'
            }
          ]
          this.#drawCircle(...endCircle)
          then(this.chartDifference)
          return
        }
        this.#clear()
        
        this.#drawChart(this.mappingData, this.settings)
        this.#drawUserLine(this.userDrowningChart, this.settings.userChartLineColor)
        
        // рисуем кружок в конце графика
        if (this.userDrowningChart[this.userDrowningChart.length - 1].y) {
          const endCircle = [
            {
              x: this.userDrowningChart[this.userDrowningChart.length - 1].x,
              y: this.userDrowningChart[this.userDrowningChart.length - 1].y
            },
            this.settings.hiddenChartLineColor,
            12,
            {textContent: false,}
          ]
          this.#drawCircle(...endCircle)
        }
        
        // Проверяем, не поря ли перейти к следующей точке
        if (prevLength >= curPoint.lineLength) {
          pointIndex++
          prevLength = 0
        }
        
        // Обновляем текущую точку (на случай, если выше условие сработало)
        curPoint = hiddenPoints[pointIndex]
        pointsArray[pointIndex + 1] = getCoordinates(curPoint, curPoint.angle, prevLength)
        
        // Рисуем тень графика
        this.ctx.beginPath()
        this.ctx.moveTo(hiddenPoints[0].x, hiddenPoints[0].y)
        let curX = 0
        pointsArray.forEach(point => {
          if (!isNaN(point.x)) {
            curX = point.x
            this.ctx.lineTo(point.x, point.y)
          }
        })
        this.ctx.lineTo(curX, this.startY)
        this.ctx.lineTo(hiddenPoints[0].x, this.startY)
        
        this.ctx.fillStyle = this.settings.shadowColors[this.data.length % 2 ? 0 : 1]
        this.ctx.fill()
        
        // Рисуем линию графика
        this.ctx.beginPath()
        this.ctx.moveTo(hiddenPoints[0].x, hiddenPoints[0].y)
        pointsArray.forEach(point => {
          this.ctx.lineTo(point.x, point.y)
        })
        this.ctx.strokeStyle = this.settings.hiddenChartLineColor
        this.ctx.strokeWidth = 7
        this.ctx.stroke()
        
        prevLength += curPoint.increment
        
        // обновляем кружки
        this.#drawCircles()
        
        timeStart = time
      }
      requestAnimationFrame(drawChart)
    }
    requestAnimationFrame(drawChart)
  }
  
  /**
   @description Обрабатывает отпускание указателя
   */
  #pointerUpHandler = () => this.canvas.removeEventListener('pointermove', this.#pointerMoveHandler)
  
  /**
   @description Обрабатывает нажатие
   @param {object} event - событие нажатия
   */
  #pointerDownHandler = (event) => {
    const {x: pointerX, y: pointerY} = this.#calculatePointerPosition(event)
    const hiddenGroup = this.mappingData.find(group => group.name === 'hidden')
    
    const maxX = Math.max(...hiddenGroup.dataSet.map(point => point.x))
    const minX = Math.min(...hiddenGroup.dataSet.map(point => point.x)) - this.intervalWidth
    
    const isXArea = pointerX >= minX && pointerX <= maxX
    const isYArea = pointerY <= this.startY && pointerY >= this.endY
    
    if (isXArea && isYArea) {
      this.canvas.addEventListener('pointermove', this.#pointerMoveHandler)
      this.canvas.addEventListener('pointerup', this.#pointerUpHandler)
    }
  }
  
  /**
   @description Рисует график пользователя
   @param {array<object>} userPoints - массив точек пользователя
   @param {string} lineColor - цвет линии
   */
  #drawUserLine = (userPoints, lineColor) => {
    this.ctx.beginPath()
    this.ctx.strokeStyle = lineColor
    this.ctx.strokeWidth = this.settings.chartLineWidth
    this.ctx.setLineDash([16, 5])
    userPoints.forEach(point => {
      if (point.y) {
        this.ctx.lineTo(point.x, point.y)
      }
    })
    this.ctx.stroke()
    this.ctx.closePath()
    this.ctx.setLineDash([10, 0])
  }
  
  /**
   @description Рисует график
   @param {object} event - событие
   @return {object}
   */
  #calculatePointerPosition = (event) => ({
    x: event.offsetX * (this.canvasWidth / this.canvas.clientWidth),
    y: event.offsetY * (this.canvasHeight / this.canvas.clientHeight)
  })
  
  /**
   @description Рисует график
   @param {array} data - данные
   @param {object} settings - настройки
   */
  #drawChart = (data, settings) => {
    const dataWithoutHiddenPart = data.filter(group => group.name !== 'hidden')
    // Рисуем задний фон
    this.#drawBg(settings.chartBackgroundLineWidth, settings.chartBackgroundLineColor, settings.chartBackgroundColor)
    
    // Рисуем линию графика без скрытой части
    this.#drawChartLine(dataWithoutHiddenPart, settings.chartLineColor, settings.chartLineWidth, settings.shadowColors)
    
    // Рисуем подписи снизу
    this.#drawXSign(34)
    
    // Рисуем названия групп
    this.#drawGroupNames(34)
  }
  
  /**
   @description Рисует кружок
   @param {{x: number, y: number}} circlePosition - координаты кружка
   @param {string} circleColor - цвет кружка
   @param {number} circleRadius - радиус кружка
   @param {string} textContent - текст для подписи
   @param {string} textColor - цвет текста
   @param {number} fontSize - размер шрифта
   @param {string} fontStyle - параметры шрифта, начертание
   */
  #drawCircle = (circlePosition, circleColor, circleRadius, {textContent, textColor, fontSize, fontStyle}) => {
    this.ctx.beginPath()
    this.ctx.arc(circlePosition.x, circlePosition.y, circleRadius, 0, Math.PI * 2)
    this.ctx.fillStyle = '#ffffff'
    this.ctx.strokeStyle = circleColor
    this.ctx.fill()
    this.ctx.stroke()
    
    const textSettings = {
      textPosition: {
        x: circlePosition.x - this.intervalWidth / 1.5,
        y: circlePosition.y < fontSize * 3 ? circlePosition.y + fontSize * 2 : circlePosition.y - fontSize
      },
      textContent: textContent ? (Number(textContent) - parseInt(textContent) ? Number(textContent).toFixed(1) : Number(textContent)) : '',
      textColor: textColor,
      fontSize: fontSize,
      fontStyle: fontStyle,
      fontWeight: 'bold'
    }
    this.#drawText(textSettings)
  }
  
  #drawCircles = () => {
    const dataWithoutHiddenPart = this.mappingData.filter(group => group.name !== 'hidden')
    // круг в начале графика
    const firstPointOfFirstGroup = {x: dataWithoutHiddenPart[0].dataSet[0].x, y: dataWithoutHiddenPart[0].dataSet[0].y}
    const beginCircle = [
      firstPointOfFirstGroup,
      this.settings.chartLineColor,
      12,
      {
        textContent: String(this.data[0].dataSet[0].y),
        textColor: '#000000',
        fontSize: '30',
        fontStyle: 'sans-serif'
      }
    ]
    this.#drawCircle(...beginCircle)
    
    // круг в конце графика
    const lastGroup = dataWithoutHiddenPart[dataWithoutHiddenPart.length - 1]
    const lastGroupDataSet = lastGroup.dataSet
    const lastPointOfLastGroup = {
      x: lastGroupDataSet[lastGroupDataSet.length - 1].x,
      y: lastGroupDataSet[lastGroupDataSet.length - 1].y
    }
    const originalLastGroup = this.data.find(group => group.name === lastGroup.name).dataSet
    const textContent = String(originalLastGroup[originalLastGroup.length - 1].y)
    const endCircle = [
      lastPointOfLastGroup,
      this.settings.hiddenChartLineColor,
      12,
      {
        textContent: textContent,
        textColor: '#000000',
        fontSize: '30',
        fontStyle: 'sans-serif'
      }
    ]
    this.#drawCircle(...endCircle)
  }
  
  
  /**
   @description Рисует текст
   @param {{x: number, y: number}} textPosition - координаты кружка
   @param {string} textContent - контент
   @param {string} textColor - цвет текста
   @param {number} fontSize - размер текста
   @param {string} fontStyle - шрифт, начертание
   @param {string | number} fontWeight - насыщенность
   @param {string} align - выравнивание
   @param {number=} maxWidth - максимальная ширина текста
   */
  #drawText = ({
                 textPosition = {x: 0, y: 0},
                 textContent,
                 textColor = '#000000',
                 fontSize = 20,
                 fontStyle = 'sans-serif',
                 fontWeight = 'normal',
                 align = 'left',
                 maxWidth
               }) => {
    this.ctx.beginPath()
    this.ctx.font = `normal normal ${fontWeight} ${fontSize}px ${fontStyle}`
    this.ctx.textAlign = align
    this.ctx.fillStyle = textColor
    this.ctx.fillText(textContent, textPosition.x, textPosition.y, maxWidth)
  }
  
  /**
   @description Рисует подписи по оси X
   @param {number} fontSize - размер шрифта
   */
  #drawXSign = (fontSize) => {
    const textSettings = {
      textPosition: {
        x: 0,
        y: this.canvasHeight
      },
      textContent: '',
      fontSize: fontSize,
      align: 'center'
    }
    
    this.mappingData.forEach((group, groupIndex) => group.dataSet.forEach((point, pointIndex) => {
      if (this.data[groupIndex].dataSet[pointIndex].x % this.xSignInterval === 0) {
        if (this.intervalsCount - this.intervalsCount % this.xSignInterval !== this.data[groupIndex].dataSet[pointIndex].x) {
          textSettings.textPosition.x = point.x
          textSettings.textContent = this.xDataMask.replace('x', this.data[groupIndex].dataSet[pointIndex].x.toString().padStart(2, '0'))
          this.#drawText(textSettings)
        }
      }
    }))
    
    textSettings.textPosition.x = this.mappingData.slice(-1)[0].dataSet.slice(-1)[0].x
    textSettings.textContent = this.xDataMask.replace('x', this.data.slice(-1)[0].dataSet.slice(-1)[0].x.toString().padStart(2, '0'))
    this.#drawText(textSettings)
  }
  
  /**
   @description Рисует имена групп
   @param {number} fontSize - размер шрифта
   */
  #drawGroupNames = (fontSize) => {
    this.mappingData.forEach((group, index) => {
      if (group.name !== 'hidden') {
        const allGroupX = group.dataSet.map(point => point.x)
        const minGroupX = Math.min(...allGroupX)
        const maxGroupX = Math.max(...allGroupX)
        
        const position = {
          x: index === 0 ? minGroupX + ((maxGroupX - minGroupX) / 2) : minGroupX + ((maxGroupX - minGroupX) / 2) - this.intervalWidth / 2,
          y: this.startY + (this.indentToActiveArea * this.fieldHeight / 2)
        }
        
        const textSettings = {
          textPosition: position,
          textContent: group.name,
          fontSize: fontSize,
          fontWeight: 'bold',
          align: 'center',
          maxWidth: maxGroupX - minGroupX
        }
        this.#drawText(textSettings)
      }
    })
  }
  
  /**
   @description Рисует линию графика
   @param {array} data - данные
   @param {string} lineColor - цвет линии
   @param {number} lineWidth - ширина линии
   @param {array<string>} shadows - массив теней
   */
  #drawChartLine = (data, lineColor, lineWidth, shadows) => {
    // Рисуем тень от линии
    data.forEach((group, index, array) => {
      this.ctx.beginPath()
      this.ctx.fillStyle = shadows[index % 2]
      
      // Захватить конец предыдущей тени
      if (array[index - 1]) {
        const prevDataSet = array[index - 1].dataSet
        const lastPointOfPrevDataset = prevDataSet[prevDataSet.length - 1]
        this.ctx.moveTo(lastPointOfPrevDataset.x, this.startY)
        this.ctx.lineTo(lastPointOfPrevDataset.x, lastPointOfPrevDataset.y)
      } else {
        this.ctx.moveTo(group.dataSet[0].x, this.startY)
      }
      
      group.dataSet.forEach(points => {
        this.ctx.lineTo(points.x, points.y)
      })
      this.ctx.lineTo(group.dataSet[group.dataSet.length - 1].x, this.startY)
      this.ctx.fill()
    })
    
    
    // Рисуем линию
    this.ctx.beginPath()
    this.ctx.strokeStyle = lineColor
    this.ctx.lineWidth = lineWidth
    
    data.forEach(group => {
      group.dataSet.forEach(points => {
        this.ctx.lineTo(points.x, points.y)
      })
    })
    this.ctx.stroke()
  }
  
  /**
   @description Адаптирует входящие координаты к размерам графика
   @param {array} data - данные
   @return {array}
   */
  #mapData = (data) => {
    const extremePoints = this.#findExtremePoints(data)
    const scalingFactor = this.#getScalingFactor(data)
    
    return data.map(group => {
      const newPoints = group.dataSet.map(points => {
        const minOffset = (extremePoints.min * scalingFactor) + (this.indentToActiveArea * this.fieldHeight)  // Поправка для установки графика в нижнюю точку активного поля
        return {
          x: this.startX + points.x * this.intervalWidth,
          y: this.startY - (points.y * scalingFactor) + minOffset
        }
      })
      return {...group, dataSet: newPoints}
    })
  }
  
  /**
   @description Вычисляет коэффициент масштабирования графиков
   @param {array} data - данные
   @return {number}
   */
  #getScalingFactor = (data) => {
    const extremePoints = this.#findExtremePoints(data)
    const activeArea = (1 - this.indentToActiveArea * 2) * -1 * this.fieldHeight
    return activeArea / (extremePoints.max - extremePoints.min)
  }
  
  /**
   @description Рисует задний фон
   @param {number} lineWidth - ширина линий
   @param {string} lineColor - цвет линий
   @param {string} bgColor - цвет фона
   */
  #drawBg = (lineWidth, lineColor, bgColor) => {
    this.ctx.fillStyle = bgColor
    this.ctx.fillRect(this.startX, this.startY, this.fieldWidth, this.fieldHeight)
    
    for (let i = 1; i < this.intervalsCount; i++) {
      this.ctx.strokeStyle = lineColor
      this.ctx.lineWidth = lineWidth
      this.ctx.beginPath()
      this.ctx.moveTo(this.startX + this.intervalWidth * i, this.startY)
      this.ctx.lineTo(this.startX + this.intervalWidth * i, this.endY)
      this.ctx.stroke()
      this.ctx.closePath()
    }
  }
  
  /**
   @description Возращает минимальную и максимальную точку по оси Y из переданных данных
   @param {array} data - входные данные
   @return {object}
   */
  #findExtremePoints = (data) => {
    let allPoints = []
    data.forEach(group => allPoints = [...allPoints, ...group.dataSet])
    allPoints = allPoints.map(point => point.y)
    return {min: Math.min(...allPoints), max: Math.max(...allPoints)}
  }
  
  /**
   @description Очищает весь canvas
   */
  #clear = () => {
    this.canvas.width = this.canvas.width
  }
  
  
  #drawCompleteChart() {
    this.#drawChart(this.mappingData, this.settings)
    this.#drawUserLine(this.userDrowningChart, this.settings.userChartLineColor)
    
    // рисуем кружок в конце графика
    if (this.userDrowningChart[this.userDrowningChart.length - 1].y) {
      const scalingFactor = this.#getScalingFactor(this.data)
      const lastY = this.canvasHeight - this.userDrowningChart[this.userDrowningChart.length - 1].y
      const endCircle = [
        {
          x: this.userDrowningChart[this.userDrowningChart.length - 1].x,
          y: this.userDrowningChart[this.userDrowningChart.length - 1].y
        },
        this.settings.hiddenChartLineColor,
        12,
        {
          textContent: (lastY / scalingFactor) + (this.indentToActiveArea * this.canvasHeight / scalingFactor),
          textColor: '#000000',
          fontSize: '30',
          fontStyle: 'sans-serif'
        }
      ]
      this.#drawCircle(...endCircle)
    }
  }
}


