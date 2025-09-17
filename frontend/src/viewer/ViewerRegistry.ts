// Simple singleton registry to share worker URL and model buffers across views
// This allows MiniSpaceViewer to reuse the model bytes that ModelViewer already fetched,
// avoiding network re-fetches and ensuring consistent versions.

class ViewerRegistry {
  private static _instance: ViewerRegistry;
  private workerUrl?: string;
  private buffers: Map<string, ArrayBuffer> = new Map();

  static get instance(): ViewerRegistry {
    if (!this._instance) this._instance = new ViewerRegistry();
    return this._instance;
  }

  setWorkerUrl(url: string) {
    this.workerUrl = url;
  }
  getWorkerUrl(): string | undefined {
    return this.workerUrl;
  }

  setModelBuffer(buildingCode: string, buffer: ArrayBuffer) {
    try {
      this.buffers.set(buildingCode, buffer);
    } catch {}
  }
  getModelBuffer(buildingCode: string): ArrayBuffer | undefined {
    return this.buffers.get(buildingCode);
  }
}

export default ViewerRegistry.instance;
