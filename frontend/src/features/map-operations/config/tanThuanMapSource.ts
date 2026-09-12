/**
 * TanThuanMapSource — Authoritative V8 Map Source Specification
 * Derived from docs/design/map-operations/reference/map-source.manifest.json
 *
 * ONLY authoritative source: tan-thuan-canonical-base.png (1915x821)
 * Runtime background policy: canonical-base-only
 */

const tanThuanPortV8Webp = new URL(
  '../../../assets/maps/tan-thuan-port-v8.webp',
  import.meta.url
).href;

export interface MapSourceContract {
  readonly mapId: string;
  readonly image: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly viewBox: string;
  readonly coordinateSystemId: string;
  readonly runtimeBackgroundPolicy: string;
  readonly sourceSha256: string;
  readonly runtimeAssetSha256: string;
  readonly version: string;
}

export const TanThuanMapSource: MapSourceContract = {
  mapId: 'tan-thuan-port',
  image: tanThuanPortV8Webp,
  width: 1915,
  height: 821,
  aspectRatio: 1915 / 821,
  viewBox: '0 0 1915 821',
  coordinateSystemId: 'tan-thuan-canonical-image-pixel-space-v1',
  runtimeBackgroundPolicy: 'canonical-base-only',
  sourceSha256: '38f3ae3c98bf7732242780381bf1124a394f4479b623c31e48082bfa19e35b61',
  runtimeAssetSha256: '13e48d4fb09e288c27cd9db0e3345514f3af7e53812c42652f23b937681bd4d6',
  version: 'v8',
} as const;

export const DEPRECATED_MAP_ASSETS = [
  'tan-thuan-canonical.png',
  'tan-thuan-canonical.webp',
  'tan-thuan-canonical-v2.webp',
] as const;
