import { productSchema, type Product, type CategorySlug, type SpecValue } from './types';

/**
 * Catálogo de Zentinel Store (datos ficticios con precios USD referenciales).
 * Las specs de los componentes del Armador son coherentes entre sí: sockets,
 * tipo de RAM, formatos de placa/case, largo de GPU y consumo (TDP).
 * Se valida con zod al cargar el módulo: un dato inconsistente impide arrancar.
 */

type Specs = Record<string, SpecValue>;
type Seed = Omit<Product, 'sku' | 'category' | 'tags'> & { tags?: string[] };

let counter = 0;
const make =
  (category: CategorySlug, prefix: string) =>
  (s: Seed): Product => {
    counter += 1;
    return {
      ...s,
      category,
      sku: `ZS-${prefix}-${String(counter).padStart(4, '0')}`,
      tags: s.tags ?? [],
    };
  };

const p = (
  id: string,
  name: string,
  brand: string,
  price: number,
  stock: number,
  rating: number,
  description: string,
  specs: Specs,
  tags: string[] = [],
): Seed => ({ id, name, brand, price, stock, rating, description, specs, tags });

const cpu = make('cpu', 'CPU');
const gpu = make('gpu', 'GPU');
const board = make('motherboard', 'MB');
const ram = make('ram', 'RAM');
const storage = make('storage', 'SSD');
const psu = make('psu', 'PSU');
const pcCase = make('case', 'CSE');
const cooling = make('cooling', 'CLR');
const audio = make('audio', 'AUD');
const cables = make('cables', 'CBL');
const chargers = make('chargers', 'CHG');
const periph = make('peripherals', 'PER');
const laptop = make('laptops', 'LAP');
const phone = make('phone-accessories', 'PHN');

const cpuSpecs = (
  socket: string,
  cores: number,
  threads: number,
  baseGhz: number,
  boostGhz: number,
  tdp: number,
  score: number,
): Specs => ({ socket, cores, threads, baseGhz, boostGhz, tdp, score });

const boardSpecs = (
  socket: string,
  chipset: string,
  ramType: string,
  formFactor: string,
  ramSlots: number,
  maxRamGB: number,
  m2Slots: number,
): Specs => ({ socket, chipset, ramType, formFactor, ramSlots, maxRamGB, m2Slots });

const ramSpecs = (
  ramType: string,
  capacityGB: number,
  modules: number,
  speedMHz: number,
  latencyCL: number,
): Specs => ({ ramType, capacityGB, modules, speedMHz, latencyCL });

const gpuSpecs = (
  chip: string,
  vramGB: number,
  tdp: number,
  lengthMm: number,
  score: number,
): Specs => ({ chip, vramGB, tdp, lengthMm, score });

const ssdSpecs = (type: string, capacityGB: number, readMBs: number): Specs => ({
  type,
  capacityGB,
  readMBs,
});

const rawCatalog: Product[] = [
  // ───────────── Procesadores ─────────────
  cpu(
    p(
      'amd-ryzen-5-5600',
      'AMD Ryzen 5 5600',
      'AMD',
      129,
      24,
      4.7,
      'Seis núcleos Zen 3 para gaming 1080p con excelente relación precio-rendimiento en plataforma AM4.',
      cpuSpecs('AM4', 6, 12, 3.5, 4.4, 65, 55),
      ['procesador', 'ryzen', 'gaming', 'am4'],
    ),
  ),
  cpu(
    p(
      'amd-ryzen-7-5700x',
      'AMD Ryzen 7 5700X',
      'AMD',
      169,
      18,
      4.6,
      'Ocho núcleos Zen 3 eficientes, ideales para multitarea y creación de contenido en AM4.',
      cpuSpecs('AM4', 8, 16, 3.4, 4.6, 65, 62),
      ['procesador', 'ryzen', 'am4', 'multitarea'],
    ),
  ),
  cpu(
    p(
      'amd-ryzen-5-7600',
      'AMD Ryzen 5 7600',
      'AMD',
      199,
      20,
      4.7,
      'Zen 4 de seis núcleos con soporte DDR5 y PCIe 5.0 sobre la plataforma AM5.',
      cpuSpecs('AM5', 6, 12, 3.8, 5.1, 65, 68),
      ['procesador', 'ryzen', 'am5', 'ddr5'],
    ),
  ),
  cpu(
    p(
      'amd-ryzen-7-7800x3d',
      'AMD Ryzen 7 7800X3D',
      'AMD',
      399,
      9,
      4.9,
      'El procesador gaming de referencia gracias a su caché 3D V-Cache de 96 MB.',
      cpuSpecs('AM5', 8, 16, 4.2, 5.0, 120, 90),
      ['procesador', 'ryzen', 'gaming', '3d vcache', 'am5'],
    ),
  ),
  cpu(
    p(
      'amd-ryzen-9-7950x',
      'AMD Ryzen 9 7950X',
      'AMD',
      549,
      6,
      4.8,
      'Dieciséis núcleos Zen 4 para edición de video 4K, render y cargas de trabajo pesadas.',
      cpuSpecs('AM5', 16, 32, 4.5, 5.7, 170, 97),
      ['procesador', 'ryzen', 'edicion', 'render', 'am5'],
    ),
  ),
  cpu(
    p(
      'intel-core-i5-12400f',
      'Intel Core i5-12400F',
      'Intel',
      149,
      30,
      4.5,
      'Seis núcleos Alder Lake de alto rendimiento por núcleo, sin gráficos integrados.',
      cpuSpecs('LGA1700', 6, 12, 2.5, 4.4, 65, 58),
      ['procesador', 'intel', 'core', 'lga1700'],
    ),
  ),
  cpu(
    p(
      'intel-core-i5-13600k',
      'Intel Core i5-13600K',
      'Intel',
      289,
      14,
      4.7,
      'Catorce núcleos híbridos (6P+8E) desbloqueados para gaming y productividad.',
      cpuSpecs('LGA1700', 14, 20, 3.5, 5.1, 125, 80),
      ['procesador', 'intel', 'core', 'overclock', 'lga1700'],
    ),
  ),
  cpu(
    p(
      'intel-core-i7-14700k',
      'Intel Core i7-14700K',
      'Intel',
      389,
      8,
      4.7,
      'Veinte núcleos híbridos para streaming, edición y gaming simultáneos.',
      cpuSpecs('LGA1700', 20, 28, 3.4, 5.6, 125, 90),
      ['procesador', 'intel', 'core', 'streaming', 'lga1700'],
    ),
  ),

  // ───────────── Tarjetas gráficas ─────────────
  gpu(
    p(
      'nvidia-rtx-4060',
      'NVIDIA GeForce RTX 4060 8GB',
      'NVIDIA',
      299,
      15,
      4.4,
      'Gaming 1080p fluido con DLSS 3 y trazado de rayos, muy eficiente en consumo.',
      gpuSpecs('AD107', 8, 115, 240, 45),
      ['gpu', 'tarjeta de video', 'geforce', 'rtx', 'dlss'],
    ),
  ),
  gpu(
    p(
      'nvidia-rtx-4060-ti',
      'NVIDIA GeForce RTX 4060 Ti 8GB',
      'NVIDIA',
      399,
      12,
      4.5,
      'Más potencia para 1080p ultra y 1440p con DLSS 3 y Frame Generation.',
      gpuSpecs('AD106', 8, 160, 250, 55),
      ['gpu', 'tarjeta de video', 'geforce', 'rtx'],
    ),
  ),
  gpu(
    p(
      'nvidia-rtx-4070-super',
      'NVIDIA GeForce RTX 4070 SUPER 12GB',
      'NVIDIA',
      599,
      10,
      4.8,
      'La opción 1440p por excelencia, con 12 GB de VRAM y Frame Generation.',
      gpuSpecs('AD104', 12, 220, 285, 72),
      ['gpu', 'tarjeta de video', 'geforce', 'rtx', '1440p'],
    ),
  ),
  gpu(
    p(
      'nvidia-rtx-4070-ti-super',
      'NVIDIA GeForce RTX 4070 Ti SUPER 16GB',
      'NVIDIA',
      799,
      7,
      4.8,
      'Rendimiento 4K accesible con 16 GB de VRAM para juegos y creación 3D.',
      gpuSpecs('AD103', 16, 285, 305, 82),
      ['gpu', 'tarjeta de video', 'geforce', 'rtx', '4k'],
    ),
  ),
  gpu(
    p(
      'nvidia-rtx-4080-super',
      'NVIDIA GeForce RTX 4080 SUPER 16GB',
      'NVIDIA',
      999,
      5,
      4.9,
      'Potencia 4K sin concesiones y aceleración de IA para creadores exigentes.',
      gpuSpecs('AD103', 16, 320, 310, 92),
      ['gpu', 'tarjeta de video', 'geforce', 'rtx', '4k', 'ia'],
    ),
  ),
  gpu(
    p(
      'amd-rx-7600',
      'AMD Radeon RX 7600 8GB',
      'AMD',
      269,
      16,
      4.2,
      'RDNA 3 para 1080p a alta tasa de cuadros con gran valor.',
      gpuSpecs('Navi 33', 8, 165, 240, 42),
      ['gpu', 'tarjeta de video', 'radeon', 'rdna3'],
    ),
  ),
  gpu(
    p(
      'amd-rx-7700-xt',
      'AMD Radeon RX 7700 XT 12GB',
      'AMD',
      419,
      11,
      4.5,
      'Equilibrio ideal para 1440p con 12 GB de VRAM y FSR 3.',
      gpuSpecs('Navi 32', 12, 245, 270, 62),
      ['gpu', 'tarjeta de video', 'radeon', '1440p'],
    ),
  ),
  gpu(
    p(
      'amd-rx-7800-xt',
      'AMD Radeon RX 7800 XT 16GB',
      'AMD',
      499,
      9,
      4.7,
      'Referente de 1440p con 16 GB de VRAM y excelente precio por fotograma.',
      gpuSpecs('Navi 32', 16, 263, 280, 70),
      ['gpu', 'tarjeta de video', 'radeon', '1440p'],
    ),
  ),

  // ───────────── Placas madre ─────────────
  board(
    p(
      'asrock-b450m-hdv',
      'ASRock B450M-HDV R4.0',
      'ASRock',
      69,
      14,
      4.0,
      'Placa mATX AM4 básica y confiable para equipos económicos DDR4.',
      boardSpecs('AM4', 'B450', 'DDR4', 'mATX', 2, 64, 1),
      ['placa madre', 'motherboard', 'am4', 'matx'],
    ),
  ),
  board(
    p(
      'msi-b550-gaming-plus',
      'MSI B550 Gaming Plus',
      'MSI',
      109,
      12,
      4.4,
      'Placa ATX AM4 con PCIe 4.0, dos ranuras M.2 y cuatro slots DDR4.',
      boardSpecs('AM4', 'B550', 'DDR4', 'ATX', 4, 128, 2),
      ['placa madre', 'motherboard', 'am4', 'atx'],
    ),
  ),
  board(
    p(
      'gigabyte-b650m-ds3h',
      'Gigabyte B650M DS3H',
      'Gigabyte',
      129,
      15,
      4.3,
      'Puerta de entrada a AM5 con DDR5 en formato mATX y PCIe 4.0 para la GPU.',
      boardSpecs('AM5', 'B650', 'DDR5', 'mATX', 4, 128, 2),
      ['placa madre', 'motherboard', 'am5', 'ddr5', 'matx'],
    ),
  ),
  board(
    p(
      'asus-tuf-b650-plus-wifi',
      'ASUS TUF Gaming B650-PLUS WiFi',
      'ASUS',
      199,
      10,
      4.6,
      'ATX AM5 robusta con WiFi 6E, VRM reforzado y tres ranuras M.2.',
      boardSpecs('AM5', 'B650', 'DDR5', 'ATX', 4, 192, 3),
      ['placa madre', 'motherboard', 'am5', 'ddr5', 'wifi'],
    ),
  ),
  board(
    p(
      'msi-mag-x670e-tomahawk',
      'MSI MAG X670E Tomahawk WiFi',
      'MSI',
      289,
      6,
      4.7,
      'Placa AM5 premium con PCIe 5.0, VRM de alta gama y conectividad completa.',
      boardSpecs('AM5', 'X670E', 'DDR5', 'ATX', 4, 192, 4),
      ['placa madre', 'motherboard', 'am5', 'ddr5', 'pcie5'],
    ),
  ),
  board(
    p(
      'asrock-b650e-itx',
      'ASRock B650E PG-ITX WiFi',
      'ASRock',
      329,
      4,
      4.5,
      'Mini-ITX AM5 para equipos compactos de alto rendimiento con DDR5 y WiFi 6E.',
      boardSpecs('AM5', 'B650E', 'DDR5', 'ITX', 2, 96, 2),
      ['placa madre', 'motherboard', 'am5', 'itx', 'compacto'],
    ),
  ),
  board(
    p(
      'asus-prime-b760m-a-d4',
      'ASUS PRIME B760M-A D4',
      'ASUS',
      119,
      13,
      4.2,
      'mATX LGA1700 con DDR4: la base más económica para Intel de 12.ª/13.ª/14.ª gen.',
      boardSpecs('LGA1700', 'B760', 'DDR4', 'mATX', 4, 128, 2),
      ['placa madre', 'motherboard', 'lga1700', 'ddr4', 'matx'],
    ),
  ),
  board(
    p(
      'msi-pro-b760-p-wifi',
      'MSI PRO B760-P WiFi DDR5',
      'MSI',
      159,
      11,
      4.3,
      'ATX LGA1700 con DDR5 y WiFi 6E para una plataforma Intel actual.',
      boardSpecs('LGA1700', 'B760', 'DDR5', 'ATX', 4, 192, 3),
      ['placa madre', 'motherboard', 'lga1700', 'ddr5', 'wifi'],
    ),
  ),
  board(
    p(
      'gigabyte-z790-aorus-elite-ax',
      'Gigabyte Z790 AORUS Elite AX',
      'Gigabyte',
      259,
      7,
      4.7,
      'Z790 para overclock con DDR5, WiFi 6E y disipación de VRM de primer nivel.',
      boardSpecs('LGA1700', 'Z790', 'DDR5', 'ATX', 4, 192, 4),
      ['placa madre', 'motherboard', 'lga1700', 'ddr5', 'overclock'],
    ),
  ),

  // ───────────── Memoria RAM ─────────────
  ram(
    p(
      'kingston-fury-beast-16-d4',
      'Kingston FURY Beast 16GB (2x8) DDR4-3200',
      'Kingston',
      42,
      40,
      4.5,
      'Kit dual channel DDR4 de 16 GB con perfil XMP y disipador de bajo perfil.',
      ramSpecs('DDR4', 16, 2, 3200, 16),
      ['memoria', 'ram', 'ddr4'],
    ),
  ),
  ram(
    p(
      'corsair-vengeance-lpx-32-d4',
      'Corsair Vengeance LPX 32GB (2x16) DDR4-3600',
      'Corsair',
      79,
      28,
      4.7,
      'Kit DDR4 de 32 GB a 3600 MHz, referencia de estabilidad para AM4 e Intel DDR4.',
      ramSpecs('DDR4', 32, 2, 3600, 18),
      ['memoria', 'ram', 'ddr4'],
    ),
  ),
  ram(
    p(
      'crucial-16-d5-5200',
      'Crucial 16GB (2x8) DDR5-5200',
      'Crucial',
      58,
      35,
      4.4,
      'Kit DDR5 de 16 GB confiable para estrenar plataforma AM5 o Intel DDR5.',
      ramSpecs('DDR5', 16, 2, 5200, 42),
      ['memoria', 'ram', 'ddr5'],
    ),
  ),
  ram(
    p(
      'kingston-fury-beast-32-d5',
      'Kingston FURY Beast 32GB (2x16) DDR5-5600',
      'Kingston',
      104,
      26,
      4.6,
      'DDR5 de 32 GB con EXPO/XMP, el punto dulce para gaming y productividad.',
      ramSpecs('DDR5', 32, 2, 5600, 36),
      ['memoria', 'ram', 'ddr5'],
    ),
  ),
  ram(
    p(
      'gskill-trident-z5-rgb-32',
      'G.Skill Trident Z5 RGB 32GB (2x16) DDR5-6000',
      'G.Skill',
      139,
      15,
      4.8,
      'DDR5-6000 CL30 con iluminación RGB, ideal para Ryzen 7000.',
      ramSpecs('DDR5', 32, 2, 6000, 30),
      ['memoria', 'ram', 'ddr5', 'rgb'],
    ),
  ),
  ram(
    p(
      'corsair-vengeance-64-d5',
      'Corsair Vengeance 64GB (2x32) DDR5-6000',
      'Corsair',
      229,
      8,
      4.7,
      'Kit de 64 GB DDR5 para edición de video, máquinas virtuales y cargas pesadas.',
      ramSpecs('DDR5', 64, 2, 6000, 36),
      ['memoria', 'ram', 'ddr5', 'edicion'],
    ),
  ),

  // ───────────── Almacenamiento ─────────────
  storage(
    p(
      'kingston-nv2-500',
      'Kingston NV2 500GB NVMe',
      'Kingston',
      39,
      50,
      4.2,
      'SSD NVMe PCIe 4.0 de 500 GB para sistema y programas.',
      ssdSpecs('NVMe', 500, 3500),
      ['ssd', 'nvme', 'm.2', 'disco'],
    ),
  ),
  storage(
    p(
      'wd-blue-sn580-1tb',
      'WD Blue SN580 1TB NVMe',
      'Western Digital',
      64,
      40,
      4.6,
      'SSD NVMe PCIe 4.0 de 1 TB con gran equilibrio entre velocidad y precio.',
      ssdSpecs('NVMe', 1000, 4150),
      ['ssd', 'nvme', 'm.2', 'disco'],
    ),
  ),
  storage(
    p(
      'crucial-p3-plus-2tb',
      'Crucial P3 Plus 2TB NVMe',
      'Crucial',
      119,
      22,
      4.5,
      'SSD NVMe de 2 TB para bibliotecas de juegos y proyectos de video.',
      ssdSpecs('NVMe', 2000, 5000),
      ['ssd', 'nvme', 'm.2', 'disco'],
    ),
  ),
  storage(
    p(
      'samsung-990-pro-2tb',
      'Samsung 990 PRO 2TB NVMe',
      'Samsung',
      169,
      12,
      4.9,
      'SSD NVMe PCIe 4.0 de gama alta con lecturas de hasta 7450 MB/s.',
      ssdSpecs('NVMe', 2000, 7450),
      ['ssd', 'nvme', 'm.2', 'disco', 'premium'],
    ),
  ),
  storage(
    p(
      'kingston-a400-480',
      'Kingston A400 480GB SSD SATA',
      'Kingston',
      34,
      45,
      4.3,
      'SSD SATA económico para revivir equipos antiguos o ampliar almacenamiento.',
      ssdSpecs('SATA SSD', 480, 500),
      ['ssd', 'sata', 'disco'],
    ),
  ),
  storage(
    p(
      'crucial-mx500-1tb',
      'Crucial MX500 1TB SSD SATA',
      'Crucial',
      79,
      30,
      4.7,
      'SSD SATA de 1 TB muy duradero para almacenamiento secundario.',
      ssdSpecs('SATA SSD', 1000, 560),
      ['ssd', 'sata', 'disco'],
    ),
  ),
  storage(
    p(
      'seagate-barracuda-2tb',
      'Seagate BarraCuda 2TB HDD',
      'Seagate',
      59,
      35,
      4.2,
      'Disco duro de 2 TB a 7200 rpm para archivos y respaldos.',
      ssdSpecs('HDD', 2000, 220),
      ['hdd', 'disco duro', 'respaldo'],
    ),
  ),
  storage(
    p(
      'wd-blue-4tb-hdd',
      'WD Blue 4TB HDD',
      'Western Digital',
      89,
      20,
      4.4,
      'Disco duro de 4 TB de alta capacidad para multimedia y archivo.',
      ssdSpecs('HDD', 4000, 180),
      ['hdd', 'disco duro', 'respaldo'],
    ),
  ),

  // ───────────── Fuentes de poder ─────────────
  psu(
    p(
      'coolermaster-mwe-550-bronze',
      'Cooler Master MWE 550 Bronze V2',
      'Cooler Master',
      59,
      25,
      4.2,
      'Fuente de 550 W 80 Plus Bronze para equipos de entrada.',
      { watts: 550, efficiency: '80 Plus Bronze', modular: 'No modular' },
      ['fuente', 'psu', '550w'],
    ),
  ),
  psu(
    p(
      'corsair-cv650',
      'Corsair CV650 650W Bronze',
      'Corsair',
      69,
      22,
      4.3,
      'Fuente de 650 W 80 Plus Bronze para gaming de gama media.',
      { watts: 650, efficiency: '80 Plus Bronze', modular: 'No modular' },
      ['fuente', 'psu', '650w'],
    ),
  ),
  psu(
    p(
      'corsair-rm750e',
      'Corsair RM750e 750W Gold',
      'Corsair',
      109,
      18,
      4.8,
      'Fuente totalmente modular de 750 W 80 Plus Gold, silenciosa y eficiente.',
      { watts: 750, efficiency: '80 Plus Gold', modular: 'Modular completa' },
      ['fuente', 'psu', '750w', 'modular'],
    ),
  ),
  psu(
    p(
      'seasonic-focus-gx-850',
      'Seasonic FOCUS GX-850 Gold',
      'Seasonic',
      149,
      10,
      4.9,
      'Fuente modular de 850 W Gold con garantía de 10 años para builds potentes.',
      { watts: 850, efficiency: '80 Plus Gold', modular: 'Modular completa' },
      ['fuente', 'psu', '850w', 'modular'],
    ),
  ),
  psu(
    p(
      'corsair-rm1000x',
      'Corsair RM1000x 1000W Gold',
      'Corsair',
      199,
      6,
      4.9,
      'Fuente de 1000 W Gold totalmente modular para GPUs de alta gama.',
      { watts: 1000, efficiency: '80 Plus Gold', modular: 'Modular completa' },
      ['fuente', 'psu', '1000w', 'modular'],
    ),
  ),

  // ───────────── Cases ─────────────
  pcCase(
    p(
      'nzxt-h5-flow',
      'NZXT H5 Flow',
      'NZXT',
      94,
      14,
      4.7,
      'Gabinete ATX de flujo de aire con dos ventiladores y panel frontal perforado.',
      { formFactors: ['ATX', 'mATX', 'ITX'], maxGpuMm: 365, maxCoolerMm: 165, fans: 2 },
      ['case', 'gabinete', 'atx', 'airflow'],
    ),
  ),
  pcCase(
    p(
      'coolermaster-nr200p',
      'Cooler Master NR200P',
      'Cooler Master',
      99,
      8,
      4.7,
      'Mini-ITX compacto con paneles de malla y espacio para GPU de hasta 305 mm.',
      { formFactors: ['ITX'], maxGpuMm: 305, maxCoolerMm: 155, fans: 2 },
      ['case', 'gabinete', 'itx', 'compacto'],
    ),
  ),
  pcCase(
    p(
      'corsair-4000d-airflow',
      'Corsair 4000D Airflow',
      'Corsair',
      104,
      16,
      4.8,
      'ATX de gestión de cables excelente y ventilación superior.',
      { formFactors: ['ATX', 'mATX', 'ITX'], maxGpuMm: 360, maxCoolerMm: 170, fans: 2 },
      ['case', 'gabinete', 'atx', 'airflow'],
    ),
  ),
  pcCase(
    p(
      'thermaltake-s100-tg',
      'Thermaltake S100 TG',
      'Thermaltake',
      64,
      18,
      4.2,
      'Micro-ATX económico con vidrio templado y buena compatibilidad.',
      { formFactors: ['mATX', 'ITX'], maxGpuMm: 290, maxCoolerMm: 160, fans: 1 },
      ['case', 'gabinete', 'matx', 'economico'],
    ),
  ),
  pcCase(
    p(
      'lian-li-lancool-216',
      'Lian Li Lancool 216',
      'Lian Li',
      109,
      9,
      4.8,
      'ATX con dos ventiladores de 160 mm y espacio para GPUs largas y refrigeración líquida.',
      { formFactors: ['ATX', 'mATX', 'ITX'], maxGpuMm: 392, maxCoolerMm: 180, fans: 3 },
      ['case', 'gabinete', 'atx', 'silencioso'],
    ),
  ),

  // ───────────── Refrigeración ─────────────
  cooling(
    p(
      'coolermaster-hyper-212',
      'Cooler Master Hyper 212 Black',
      'Cooler Master',
      29,
      30,
      4.4,
      'Disipador por aire de torre con cuatro heatpipes y ventilador de 120 mm.',
      {
        kind: 'Aire',
        tdpRating: 150,
        heightMm: 159,
        sockets: ['AM4', 'AM5', 'LGA1700'],
        noiseDb: 30,
      },
      ['cooler', 'disipador', 'aire'],
    ),
  ),
  cooling(
    p(
      'deepcool-ak400',
      'DeepCool AK400',
      'DeepCool',
      35,
      28,
      4.7,
      'Disipador de aire de alto rendimiento por precio, con 220 W de capacidad térmica.',
      {
        kind: 'Aire',
        tdpRating: 220,
        heightMm: 155,
        sockets: ['AM4', 'AM5', 'LGA1700'],
        noiseDb: 28,
      },
      ['cooler', 'disipador', 'aire'],
    ),
  ),
  cooling(
    p(
      'noctua-nh-d15',
      'Noctua NH-D15',
      'Noctua',
      109,
      10,
      4.9,
      'Referente del enfriamiento por aire: doble torre y doble ventilador, muy silencioso.',
      {
        kind: 'Aire',
        tdpRating: 250,
        heightMm: 165,
        sockets: ['AM4', 'AM5', 'LGA1700'],
        noiseDb: 24,
      },
      ['cooler', 'disipador', 'aire', 'silencioso'],
    ),
  ),
  cooling(
    p(
      'arctic-liquid-freezer-ii-240',
      'Arctic Liquid Freezer II 240',
      'Arctic',
      99,
      12,
      4.8,
      'Refrigeración líquida AIO de 240 mm con excelente rendimiento térmico.',
      {
        kind: 'Líquida',
        tdpRating: 300,
        heightMm: 55,
        sockets: ['AM4', 'AM5', 'LGA1700'],
        noiseDb: 26,
      },
      ['cooler', 'aio', 'liquida'],
    ),
  ),

  // ───────────── Audio ─────────────
  audio(
    p(
      'apple-airpods-pro-2',
      'Apple AirPods Pro (2.ª gen) USB-C',
      'Apple',
      249,
      20,
      4.8,
      'Cancelación activa de ruido, audio espacial y estuche de carga MagSafe USB-C.',
      { type: 'Intrauditivo', batteryH: 6, anc: 'Sí', weightG: 5.3, connection: 'Bluetooth 5.3' },
      ['airpods', 'auriculares', 'audifonos', 'inalambrico', 'anc'],
    ),
  ),
  audio(
    p(
      'apple-airpods-4',
      'Apple AirPods 4',
      'Apple',
      129,
      25,
      4.5,
      'Diseño renovado, chip H2 y audio espacial con estuche USB-C.',
      { type: 'Intrauditivo', batteryH: 5, anc: 'No', weightG: 4.3, connection: 'Bluetooth 5.3' },
      ['airpods', 'auriculares', 'audifonos', 'inalambrico'],
    ),
  ),
  audio(
    p(
      'sony-wh-1000xm5',
      'Sony WH-1000XM5',
      'Sony',
      349,
      9,
      4.9,
      'Diademas con la mejor cancelación de ruido del mercado y 30 horas de batería.',
      { type: 'Diadema', batteryH: 30, anc: 'Sí', weightG: 250, connection: 'Bluetooth 5.2' },
      ['auriculares', 'audifonos', 'diadema', 'anc', 'inalambrico'],
    ),
  ),
  audio(
    p(
      'jbl-tune-520bt',
      'JBL Tune 520BT',
      'JBL',
      49,
      35,
      4.3,
      'Diadema inalámbrica ligera con bajos JBL Pure Bass y 57 horas de autonomía.',
      { type: 'Diadema', batteryH: 57, anc: 'No', weightG: 157, connection: 'Bluetooth 5.3' },
      ['auriculares', 'audifonos', 'diadema', 'inalambrico', 'economico'],
    ),
  ),
  audio(
    p(
      'hyperx-cloud-ii',
      'HyperX Cloud II',
      'HyperX',
      79,
      22,
      4.6,
      'Auriculares gaming con sonido envolvente 7.1 virtual y micrófono desmontable.',
      { type: 'Diadema', batteryH: 0, anc: 'No', weightG: 320, connection: 'USB / 3.5 mm' },
      ['auriculares', 'audifonos', 'gaming', 'microfono'],
    ),
  ),

  // ───────────── Cables y adaptadores ─────────────
  cables(
    p(
      'hdmi-21-2m',
      'Cable HDMI 2.1 8K 2 m',
      'Ugreen',
      14,
      60,
      4.6,
      'Cable HDMI 2.1 certificado con soporte 8K a 60 Hz y 4K a 120 Hz.',
      { length: '2 m', standard: 'HDMI 2.1', maxRes: '8K60 / 4K120' },
      ['cable', 'hdmi', 'video'],
    ),
  ),
  cables(
    p(
      'usbc-100w-1m',
      'Cable USB-C a USB-C 100 W 1 m',
      'Anker',
      12,
      80,
      4.7,
      'Cable trenzado con Power Delivery de 100 W y datos a 480 Mbps.',
      { length: '1 m', standard: 'USB 2.0 PD 100W' },
      ['cable', 'usb-c', 'carga'],
    ),
  ),
  cables(
    p(
      'displayport-14-18m',
      'Cable DisplayPort 1.4 1,8 m',
      'Cable Matters',
      15,
      45,
      4.6,
      'DisplayPort 1.4 para monitores gaming de 1440p/4K a alta frecuencia.',
      { length: '1,8 m', standard: 'DisplayPort 1.4', maxRes: '8K60 / 4K144' },
      ['cable', 'displayport', 'monitor'],
    ),
  ),
  cables(
    p(
      'usbc-hub-7in1',
      'Hub USB-C 7 en 1',
      'Ugreen',
      39,
      30,
      4.4,
      'Adaptador con HDMI 4K, USB-A, lector SD y carga pasante de 100 W.',
      { ports: '7', standard: 'USB-C 3.0', maxRes: '4K30' },
      ['hub', 'adaptador', 'usb-c', 'laptop'],
    ),
  ),

  // ───────────── Cargadores y power banks ─────────────
  chargers(
    p(
      'anker-735-65w',
      'Anker 735 GaN 65 W',
      'Anker',
      49,
      40,
      4.8,
      'Cargador GaN de 65 W con tres puertos para laptop, tablet y celular.',
      { watts: 65, ports: 3, technology: 'GaN II' },
      ['cargador', 'gan', 'usb-c', 'laptop'],
    ),
  ),
  chargers(
    p(
      'baseus-powerbank-20000',
      'Baseus Power Bank 20000 mAh 65 W',
      'Baseus',
      59,
      25,
      4.5,
      'Batería externa de 20 000 mAh capaz de cargar laptops por USB-C.',
      { watts: 65, capacityMah: 20000, ports: 3 },
      ['power bank', 'bateria', 'cargador', 'portatil'],
    ),
  ),
  chargers(
    p(
      'apple-20w',
      'Cargador Apple 20 W USB-C',
      'Apple',
      19,
      70,
      4.7,
      'Cargador oficial de 20 W para carga rápida de iPhone y iPad.',
      { watts: 20, ports: 1, technology: 'USB-C PD' },
      ['cargador', 'iphone', 'usb-c'],
    ),
  ),
  chargers(
    p(
      'anker-powercore-10000',
      'Anker PowerCore 10000',
      'Anker',
      25,
      55,
      4.7,
      'Power bank compacto de 10 000 mAh del tamaño de una tarjeta.',
      { watts: 12, capacityMah: 10000, ports: 1 },
      ['power bank', 'bateria', 'cargador', 'celular'],
    ),
  ),

  // ───────────── Periféricos ─────────────
  periph(
    p(
      'redragon-k552',
      'Redragon K552 Kumara',
      'Redragon',
      39,
      40,
      4.6,
      'Teclado mecánico TKL compacto con switches Outemu Blue y retroiluminación.',
      { type: 'Teclado', layout: 'TKL', switches: 'Outemu Blue' },
      ['teclado', 'keyboard', 'mecanico', 'gaming'],
    ),
  ),
  periph(
    p(
      'keychron-k2',
      'Keychron K2 V2',
      'Keychron',
      89,
      15,
      4.7,
      'Teclado mecánico inalámbrico al 75 % compatible con Mac y Windows.',
      { type: 'Teclado', layout: '75%', switches: 'Gateron Brown' },
      ['teclado', 'keyboard', 'mecanico', 'inalambrico'],
    ),
  ),
  periph(
    p(
      'logitech-mx-master-3s',
      'Logitech MX Master 3S',
      'Logitech',
      99,
      18,
      4.9,
      'Mouse ergonómico de precisión con scroll silencioso para productividad.',
      { type: 'Mouse', dpi: 8000, wireless: 'Sí' },
      ['mouse', 'raton', 'ergonomico', 'inalambrico'],
    ),
  ),
  periph(
    p(
      'razer-deathadder-v3',
      'Razer DeathAdder V3',
      'Razer',
      69,
      20,
      4.7,
      'Mouse gaming ultraligero de 59 g con sensor óptico de 30 000 DPI.',
      { type: 'Mouse', dpi: 30000, wireless: 'No' },
      ['mouse', 'raton', 'gaming', 'ligero'],
    ),
  ),
  periph(
    p(
      'logitech-g203',
      'Logitech G203 Lightsync',
      'Logitech',
      25,
      50,
      4.5,
      'Mouse gaming económico con sensor de 8000 DPI e iluminación RGB.',
      { type: 'Mouse', dpi: 8000, wireless: 'No' },
      ['mouse', 'raton', 'gaming', 'economico'],
    ),
  ),
  periph(
    p(
      'lg-24-144hz',
      'Monitor LG UltraGear 24" 144 Hz',
      'LG',
      139,
      14,
      4.5,
      'Monitor IPS Full HD de 24" a 144 Hz y 1 ms para gaming competitivo.',
      { type: 'Monitor', sizeIn: 24, resolution: '1920x1080', refreshHz: 144, panel: 'IPS' },
      ['monitor', 'pantalla', 'gaming', '144hz'],
    ),
  ),
  periph(
    p(
      'dell-s2721dgf',
      'Monitor Dell S2721DGF 27" QHD 165 Hz',
      'Dell',
      289,
      8,
      4.7,
      'Monitor Nano IPS QHD de 27" a 165 Hz con FreeSync Premium Pro.',
      { type: 'Monitor', sizeIn: 27, resolution: '2560x1440', refreshHz: 165, panel: 'Nano IPS' },
      ['monitor', 'pantalla', 'gaming', '1440p'],
    ),
  ),
  periph(
    p(
      'samsung-odyssey-g5-32',
      'Monitor Samsung Odyssey G5 32" QHD 165 Hz',
      'Samsung',
      279,
      7,
      4.5,
      'Monitor curvo de 32" QHD VA con 165 Hz y HDR10 para inmersión total.',
      { type: 'Monitor', sizeIn: 32, resolution: '2560x1440', refreshHz: 165, panel: 'VA curvo' },
      ['monitor', 'pantalla', 'gaming', 'curvo'],
    ),
  ),

  // ───────────── Laptops ─────────────
  laptop(
    p(
      'lenovo-ideapad-slim-3',
      'Lenovo IdeaPad Slim 3 15" Ryzen 5',
      'Lenovo',
      549,
      12,
      4.3,
      'Laptop ligera para estudio y oficina con Ryzen 5, 16 GB de RAM y SSD de 512 GB.',
      {
        cpu: 'Ryzen 5 7520U',
        screenIn: 15.6,
        ramGB: 16,
        storageGB: 512,
        weightKg: 1.6,
        batteryWh: 47,
      },
      ['laptop', 'portatil', 'notebook', 'estudio'],
    ),
  ),
  laptop(
    p(
      'asus-tuf-f15-4050',
      'ASUS TUF Gaming F15 RTX 4050',
      'ASUS',
      999,
      8,
      4.5,
      'Laptop gaming con Core i5, RTX 4050, 16 GB de RAM y pantalla de 144 Hz.',
      {
        cpu: 'Core i5-12500H',
        screenIn: 15.6,
        ramGB: 16,
        storageGB: 512,
        weightKg: 2.2,
        batteryWh: 48,
      },
      ['laptop', 'portatil', 'notebook', 'gaming'],
    ),
  ),
  laptop(
    p(
      'apple-macbook-air-m2',
      'Apple MacBook Air 13" M2',
      'Apple',
      999,
      10,
      4.9,
      'Ultrabook sin ventilador con chip M2, pantalla Liquid Retina y hasta 18 h de batería.',
      { cpu: 'Apple M2', screenIn: 13.6, ramGB: 8, storageGB: 256, weightKg: 1.24, batteryWh: 52 },
      ['laptop', 'portatil', 'macbook', 'ultrabook'],
    ),
  ),
  laptop(
    p(
      'hp-pavilion-15',
      'HP Pavilion 15 Core i5',
      'HP',
      649,
      11,
      4.2,
      'Laptop versátil con Core i5, 16 GB de RAM y pantalla Full HD antirreflejo.',
      {
        cpu: 'Core i5-1335U',
        screenIn: 15.6,
        ramGB: 16,
        storageGB: 512,
        weightKg: 1.74,
        batteryWh: 41,
      },
      ['laptop', 'portatil', 'notebook', 'oficina'],
    ),
  ),
  laptop(
    p(
      'acer-nitro-v15-4060',
      'Acer Nitro V15 RTX 4060',
      'Acer',
      1099,
      6,
      4.4,
      'Laptop gaming con Ryzen 7, RTX 4060 y 16 GB de RAM para jugar y crear.',
      {
        cpu: 'Ryzen 7 7735HS',
        screenIn: 15.6,
        ramGB: 16,
        storageGB: 512,
        weightKg: 2.1,
        batteryWh: 57,
      },
      ['laptop', 'portatil', 'notebook', 'gaming'],
    ),
  ),

  // ───────────── Accesorios de celular ─────────────
  phone(
    p(
      'spigen-ultra-hybrid-iphone-15',
      'Funda Spigen Ultra Hybrid iPhone 15',
      'Spigen',
      15,
      60,
      4.7,
      'Funda transparente con bordes elevados y protección contra caídas militar.',
      { compatible: 'iPhone 15', material: 'TPU + policarbonato' },
      ['funda', 'case', 'iphone', 'proteccion'],
    ),
  ),
  phone(
    p(
      'vidrio-templado-s24',
      'Vidrio templado Samsung Galaxy S24 (2 uds.)',
      'Spigen',
      9,
      90,
      4.5,
      'Pack de dos protectores de vidrio templado 9H con kit de instalación.',
      { compatible: 'Galaxy S24', material: 'Vidrio 9H' },
      ['protector', 'vidrio', 'samsung', 'pantalla'],
    ),
  ),
  phone(
    p(
      'soporte-magsafe-auto',
      'Soporte magnético MagSafe para auto',
      'Baseus',
      19,
      45,
      4.4,
      'Soporte magnético para rejilla del auto compatible con MagSafe.',
      { compatible: 'iPhone 12–15', material: 'Aluminio + imán N52' },
      ['soporte', 'magsafe', 'auto', 'iphone'],
    ),
  ),
  phone(
    p(
      'cargador-inalambrico-15w',
      'Cargador inalámbrico 15 W Qi2',
      'Anker',
      22,
      38,
      4.5,
      'Base de carga inalámbrica Qi2 de 15 W con alineación magnética.',
      { compatible: 'iPhone 13–15 / Qi', material: 'Silicona + ABS' },
      ['cargador', 'inalambrico', 'qi2', 'magsafe'],
    ),
  ),
];

/** Catálogo validado (lanza al cargar si algún producto es inconsistente). */
export const catalog: readonly Product[] = rawCatalog.map((prod) => productSchema.parse(prod));

const ids = new Set<string>();
for (const prod of catalog) {
  if (ids.has(prod.id)) throw new Error(`Producto duplicado en el catálogo: ${prod.id}`);
  ids.add(prod.id);
}

const byId = new Map(catalog.map((prod) => [prod.id, prod]));
export const getProduct = (id: string): Product | undefined => byId.get(id);
