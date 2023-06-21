/**
 @description Создает канвас
 @param {number} width - ширина канваса
 @param {number} height - высота канваса
 @return {HTMLElement}
 */
export const createCanvas = (width = 500, height = 300) => {
  const canvas = document.createElement('canvas')
  canvas.width = width;
  canvas.height = height;
  canvas.style = 'display: block; width: 100%; height: 100%; touch-action: none;'
  return canvas
}
