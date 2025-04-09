import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { YoloService } from './yolo.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvas2') canvas2Ref!: ElementRef<HTMLCanvasElement>;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;

  constructor(private yolo: YoloService) {}

  ngOnInit() {
    this.yolo.loadModel().then(() => {
      console.log('Modelo cargado');
      this.startWebcam();
    }).catch(err => console.error('Error al cargar modelo', err));
  }

  async startWebcam() {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const canvas2 = this.canvas2Ref.nativeElement;
    const ctx2 = canvas2.getContext('2d')!;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      video.onloadedmetadata = () => {
        video.play();
        canvas.width = 640;
        canvas.height = 640;
        this.detectFrame(video, ctx, ctx2, canvas);
      };
    } catch (err) {
      console.error('Error al acceder a la webcam:', err);
    }
  }

  detectFrame(video: HTMLVideoElement, ctx: CanvasRenderingContext2D, ctx2: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const process = async () => {
      ctx.drawImage(video, 0, 0, 640, 640);

      try {
        const result = await this.yolo.predict(canvas); // Puede ser canvas o frame de video

        const { boxes, confidences } = result;
        ctx2.clearRect(0, 0, canvas.width, canvas.height);

        boxes.forEach((box: number[], i: number) => {

          i === 0 ? console.log("se ha detectado algo") : null;
          const [xRaw, yRaw, wRaw, hRaw] = box.map(coord => coord / 640);
          const x = (xRaw - 0.03) * 640;
          const y = (yRaw - 0.08) * 640;
          const width = wRaw * 640;
          const height = hRaw * 640;

          if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > canvas.width || y + height > canvas.height) return;

          ctx2.strokeStyle = 'red';
          ctx2.lineWidth = 2;
          ctx2.strokeRect(x, y, width, height);

          const confidence = (confidences[i] * 100).toFixed(1);
          ctx2.font = '16px Arial';
          ctx2.fillStyle = 'yellow';
          ctx2.fillText(`Conf: ${confidence}%`, x, y - 5);
        });
      } catch (error) {
        console.error('Error en la predicción:', error);
      }

      requestAnimationFrame(process); // Llama de nuevo para el siguiente frame
    };

    process(); // Iniciar bucle de detección
  }
}
