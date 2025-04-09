import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';

@Injectable({
  providedIn: 'root'
})
export class YoloService {
  private model: tf.GraphModel | null = null;
  private modelLoaded: boolean = false;  // Nueva propiedad para verificar si el modelo está cargado

  // Método para cargar el modelo
  async loadModel(): Promise<void> {
    // console.log("aquí deberia cargarse el modelo")
    try {
      this.model = await tf.loadGraphModel('assets/model/model.json');
      this.modelLoaded = true;  // Marcamos que el modelo se cargó correctamente
      console.log('Modelo cargado con éxito');
    } catch (error) {
      console.error('Error al cargar el modelo:', error);
      this.modelLoaded = false;  // Si hubo error, aseguramos que no esté cargado
    }
  }

  // Método para predecir
  async predict(imageData: HTMLImageElement | HTMLCanvasElement): Promise<any> {
    if (!this.modelLoaded) {
      throw new Error('Modelo no cargado aún');
    }

    const input = tf.tidy(() => {
      return tf.browser.fromPixels(imageData)
        .resizeNearestNeighbor([640, 640])
        .toFloat()
        .expandDims(0)
        .div(255.0);
    });

    console.log("yolo");

    // Ejecutar el modelo
    const output = await this.model!.executeAsync(input) as tf.Tensor;

    // Procesar el resultado fuera del tidy
    const transposed = output.transpose([2, 1, 0]).squeeze(); // [8400, 6]
    const data = await transposed.array() as number[][];

    const boxes: number[][] = [];
    const classIds: number[] = [];
    const confidences: number[] = [];

    for (const pred of data) {
      const [x, y, w, h, conf, classId] = pred;
      if (conf > 0.3) {
        boxes.push([x, y, w, h]);
        classIds.push(classId);
        confidences.push(conf);
      }
    }

    // Limpiar manualmente tensores
    input.dispose();
    output.dispose();
    transposed.dispose?.(); // por si es necesario

    return {
      boxes,
      classIds,
      confidences
    };
  }

}
