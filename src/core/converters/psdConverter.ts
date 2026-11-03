import Psd from '@webtoon/psd';

export interface PsdDecodeResult {
  width: number;
  height: number;
  imageData: ImageData;
}

export async function decodePsdBuffer(buffer: ArrayBuffer): Promise<PsdDecodeResult> {
  const psd = Psd.parse(buffer);
  const width = psd.width;
  const height = psd.height;
  const pixelData = await psd.composite();
  const copy = new Uint8ClampedArray(pixelData.length);
  copy.set(pixelData);
  const imageData = new ImageData(copy, width, height);
  return {
    width,
    height,
    imageData,
  };
}
