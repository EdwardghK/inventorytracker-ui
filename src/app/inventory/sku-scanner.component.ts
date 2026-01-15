import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

@Component({
  selector: 'app-sku-scanner',
  standalone: true,
  template: `
    <div class="scanner">
      <video #preview autoplay muted playsinline></video>
      <div class="controls">
        <span>Point camera at barcode</span>
        <button type="button" (click)="stop()">Close</button>
      </div>
    </div>
  `,
  styles: [
    `
      .scanner {
        position: relative;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        overflow: hidden;
        background: #000;
      }
      video {
        width: 100%;
        height: clamp(220px, 50vw, 320px);
        object-fit: cover;
      }
      .controls {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: rgba(15, 23, 42, 0.6);
        color: #fff;
      }
      button {
        border: 1px solid #e2e8f0;
        background: #fff;
        color: #0f172a;
        border-radius: 8px;
        padding: 0.35rem 0.7rem;
        cursor: pointer;
      }
    `,
  ],
})
export class SkuScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('preview', { static: true }) preview!: ElementRef<HTMLVideoElement>;
  @Output() scanned = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  private reader = new BrowserMultiFormatReader();
  private controls?: IScannerControls;

  async ngAfterViewInit() {
    try {
      this.controls = await this.reader.decodeFromVideoDevice(
        undefined,
        this.preview.nativeElement,
        (result) => {
          if (result) {
            this.scanned.emit(result.getText());
            this.stop();
          }
        }
      );
    } catch (err) {
      console.error('Camera error:', err);
      this.stop();
    }
  }

  stop() {
    if (this.controls) {
      this.controls.stop();
      this.controls = undefined;
    }
    this.closed.emit();
  }

  ngOnDestroy() {
    this.stop();
  }
}
