import type { Product } from '../api/types';

/**
 * Ilustraciones SVG propias por categoría (sin imágenes externas).
 * Los colores salen de los design tokens: el matiz (--h) se deriva del id del producto
 * para que cada tarjeta tenga su propio gradiente dentro de la paleta de marca.
 */

function hueFor(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  // Rango acotado alrededor del acento (verde-azulado → azul → violeta).
  return 150 + (h % 150);
}

type Kind =
  | 'ram'
  | 'cpu'
  | 'gpu'
  | 'motherboard'
  | 'nvme'
  | 'hdd'
  | 'psu'
  | 'case'
  | 'cooling'
  | 'headphones'
  | 'earbuds'
  | 'cable'
  | 'charger'
  | 'powerbank'
  | 'keyboard'
  | 'mouse'
  | 'monitor'
  | 'laptop'
  | 'phone';

export function artKind(p: Pick<Product, 'category' | 'specs' | 'tags'>): Kind {
  switch (p.category) {
    case 'storage':
      return p.specs.type === 'HDD' ? 'hdd' : 'nvme';
    case 'audio':
      return p.tags.includes('airpods') ? 'earbuds' : 'headphones';
    case 'chargers':
      return p.tags.includes('power bank') ? 'powerbank' : 'charger';
    case 'peripherals':
      return p.specs.type === 'Teclado'
        ? 'keyboard'
        : p.specs.type === 'Mouse'
          ? 'mouse'
          : 'monitor';
    case 'cables':
      return 'cable';
    case 'laptops':
      return 'laptop';
    case 'phone-accessories':
      return 'phone';
    default:
      return p.category as Kind;
  }
}

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
const F = { fill: 'currentColor', opacity: 0.18 } as const;

function Glyph({ kind }: { kind: Kind }) {
  switch (kind) {
    case 'ram':
      return (
        <g {...S}>
          <rect x="30" y="48" width="140" height="44" rx="4" {...F} />
          <rect x="30" y="48" width="140" height="44" rx="4" />
          {[48, 72, 96, 120].map((x) => (
            <rect key={x} x={x} y="56" width="18" height="18" rx="2" />
          ))}
          <path d="M40 92v10M56 92v10M72 92v10M88 92v10M112 92v10M128 92v10M144 92v10M160 92v10" />
          <path d="M96 92v10" />
        </g>
      );
    case 'cpu':
      return (
        <g {...S}>
          <rect x="58" y="34" width="84" height="84" rx="8" {...F} />
          <rect x="58" y="34" width="84" height="84" rx="8" />
          <rect x="78" y="54" width="44" height="44" rx="4" />
          <path d="M70 22v12M86 22v12M102 22v12M118 22v12M134 22v12M70 118v12M86 118v12M102 118v12M118 118v12M134 118v12M46 46h12M46 62h12M46 78h12M46 94h12M46 110h12M142 46h12M142 62h12M142 78h12M142 94h12M142 110h12" />
        </g>
      );
    case 'gpu':
      return (
        <g {...S}>
          <rect x="22" y="40" width="156" height="62" rx="8" {...F} />
          <rect x="22" y="40" width="156" height="62" rx="8" />
          <circle cx="68" cy="71" r="20" />
          <circle cx="68" cy="71" r="6" />
          <circle cx="128" cy="71" r="20" />
          <circle cx="128" cy="71" r="6" />
          <path d="M22 108h60M96 108h82M30 40V28M170 40V28" />
        </g>
      );
    case 'motherboard':
      return (
        <g {...S}>
          <rect x="40" y="22" width="120" height="104" rx="6" {...F} />
          <rect x="40" y="22" width="120" height="104" rx="6" />
          <rect x="56" y="38" width="36" height="36" rx="3" />
          <path d="M112 36v40M122 36v40M132 36v40M142 36v40M56 94h56M56 106h88M120 92h26v22h-26z" />
        </g>
      );
    case 'nvme':
      return (
        <g {...S}>
          <rect x="24" y="52" width="152" height="40" rx="5" {...F} />
          <rect x="24" y="52" width="152" height="40" rx="5" />
          <rect x="44" y="60" width="28" height="24" rx="2" />
          <rect x="82" y="60" width="28" height="24" rx="2" />
          <circle cx="164" cy="72" r="5" />
          <path d="M24 100v6" />
        </g>
      );
    case 'hdd':
      return (
        <g {...S}>
          <rect x="44" y="26" width="112" height="100" rx="8" {...F} />
          <rect x="44" y="26" width="112" height="100" rx="8" />
          <circle cx="100" cy="76" r="30" />
          <circle cx="100" cy="76" r="7" />
          <path d="M100 76l22-30" />
        </g>
      );
    case 'psu':
      return (
        <g {...S}>
          <rect x="34" y="36" width="132" height="84" rx="8" {...F} />
          <rect x="34" y="36" width="132" height="84" rx="8" />
          <circle cx="92" cy="78" r="28" />
          <path d="M92 50v56M64 78h56M72 58l40 40M112 58l-40 40" />
          <path d="M140 52h16M140 64h16" />
        </g>
      );
    case 'case':
      return (
        <g {...S}>
          <rect x="56" y="14" width="88" height="122" rx="8" {...F} />
          <rect x="56" y="14" width="88" height="122" rx="8" />
          <rect x="66" y="26" width="52" height="64" rx="4" />
          <circle cx="92" cy="108" r="12" />
          <path d="M130 26v64M70 128h60" />
        </g>
      );
    case 'cooling':
      return (
        <g {...S}>
          <circle cx="100" cy="75" r="52" {...F} />
          <circle cx="100" cy="75" r="52" />
          <circle cx="100" cy="75" r="9" />
          <path d="M100 66c-2-18 8-30 22-30 4 14-4 26-22 30zM109 75c18-2 30 8 30 22-14 4-26-4-30-22zM100 84c2 18-8 30-22 30-4-14 4-26 22-30zM91 75c-18 2-30-8-30-22 14-4 26 4 30 22z" />
        </g>
      );
    case 'headphones':
      return (
        <g {...S}>
          <path d="M44 88V76a56 56 0 0 1 112 0v12" />
          <rect x="34" y="84" width="26" height="42" rx="10" {...F} />
          <rect x="34" y="84" width="26" height="42" rx="10" />
          <rect x="140" y="84" width="26" height="42" rx="10" {...F} />
          <rect x="140" y="84" width="26" height="42" rx="10" />
        </g>
      );
    case 'earbuds':
      return (
        <g {...S}>
          <path
            d="M66 36a20 20 0 0 1 20 20v8a20 20 0 0 1-8 16v34a6 6 0 0 1-12 0V80a20 20 0 0 1-12-18V56a20 20 0 0 1 12-20z"
            {...F}
          />
          <path d="M66 36a20 20 0 0 1 20 20v8a20 20 0 0 1-8 16v34a6 6 0 0 1-12 0V80a20 20 0 0 1-12-18V56a20 20 0 0 1 12-20z" />
          <path d="M134 36a20 20 0 0 0-20 20v8a20 20 0 0 0 8 16v34a6 6 0 0 0 12 0V80a20 20 0 0 0 12-18V56a20 20 0 0 0-12-20z" />
        </g>
      );
    case 'cable':
      return (
        <g {...S}>
          <rect x="14" y="62" width="30" height="26" rx="4" {...F} />
          <rect x="14" y="62" width="30" height="26" rx="4" />
          <rect x="156" y="62" width="30" height="26" rx="4" {...F} />
          <rect x="156" y="62" width="30" height="26" rx="4" />
          <path d="M44 75c26 0 26-34 52-34s26 68 52 68 4-34 8-34" />
        </g>
      );
    case 'charger':
      return (
        <g {...S}>
          <rect x="60" y="30" width="80" height="78" rx="12" {...F} />
          <rect x="60" y="30" width="80" height="78" rx="12" />
          <path d="M84 30V16M116 30V16M90 108v14h20v-14M104 52l-12 22h16l-12 22" />
        </g>
      );
    case 'powerbank':
      return (
        <g {...S}>
          <rect x="62" y="18" width="76" height="114" rx="14" {...F} />
          <rect x="62" y="18" width="76" height="114" rx="14" />
          <path d="M80 36h40M100 66l-10 18h16l-10 18" />
          <circle cx="100" cy="120" r="3" />
        </g>
      );
    case 'keyboard':
      return (
        <g {...S}>
          <rect x="18" y="42" width="164" height="66" rx="8" {...F} />
          <rect x="18" y="42" width="164" height="66" rx="8" />
          <path d="M34 58h8M52 58h8M70 58h8M88 58h8M106 58h8M124 58h8M142 58h8M160 58h8M34 74h8M52 74h8M70 74h8M88 74h8M106 74h8M124 74h8M142 74h8M160 74h8M50 92h100" />
        </g>
      );
    case 'mouse':
      return (
        <g {...S}>
          <rect x="68" y="18" width="64" height="114" rx="32" {...F} />
          <rect x="68" y="18" width="64" height="114" rx="32" />
          <path d="M100 18v44M68 62h64" />
          <rect x="94" y="34" width="12" height="18" rx="6" />
        </g>
      );
    case 'monitor':
      return (
        <g {...S}>
          <rect x="22" y="22" width="156" height="94" rx="8" {...F} />
          <rect x="22" y="22" width="156" height="94" rx="8" />
          <path d="M100 116v14M72 134h56" />
        </g>
      );
    case 'laptop':
      return (
        <g {...S}>
          <rect x="44" y="28" width="112" height="76" rx="6" {...F} />
          <rect x="44" y="28" width="112" height="76" rx="6" />
          <path d="M20 112h160l-12 14H32z" />
        </g>
      );
    case 'phone':
      return (
        <g {...S}>
          <rect x="66" y="14" width="68" height="122" rx="14" {...F} />
          <rect x="66" y="14" width="68" height="122" rx="14" />
          <rect x="74" y="24" width="52" height="102" rx="8" />
          <circle cx="86" cy="36" r="4" />
        </g>
      );
  }
}

interface Props {
  product: Pick<Product, 'id' | 'category' | 'specs' | 'tags' | 'name'>;
  size?: 'card' | 'hero' | 'thumb';
}

export function ProductArt({ product, size = 'card' }: Props) {
  const kind = artKind(product);
  return (
    <div
      className={`art art--${size}`}
      style={{ ['--h' as string]: hueFor(product.id) }}
      role="img"
      aria-label={`Ilustración de ${product.name}`}
    >
      <svg viewBox="0 0 200 150" aria-hidden="true">
        <Glyph kind={kind} />
      </svg>
    </div>
  );
}
