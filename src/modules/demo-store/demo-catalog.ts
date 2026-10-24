/**
 * DEMO catalog. Everything here (ids, SKUs, prices, stock) is fictional sample data,
 * kept apart from the live inventory tables. Never merge it into live queries and
 * never write it to the database.
 */
export const DEMO_ID_PREFIX = "demo-";
export const isDemoId = (id: string) => id.startsWith(DEMO_ID_PREFIX);

export const DEMO_CATEGORIES = [
  { id: "demo-cat-stationery", name: "Stationery" },
  { id: "demo-cat-electronics", name: "Electronics" },
  { id: "demo-cat-lab", name: "Lab supplies" },
  { id: "demo-cat-campus", name: "Campus essentials" },
] as const;

export type DemoProduct = { id: string; sku: string; name: string; description: string; categoryId: string; unit: string; price: string; stock: number; image: string };

export const DEMO_PRODUCTS: readonly DemoProduct[] = [
  { id: "demo-notebook-a7", sku: "DEMO-STN-001", name: "A7 spiral notebook", description: "Pocket-size spiral notebook, 100 pages, ideal for lab notes and quick lists.", categoryId: "demo-cat-stationery", unit: "pcs", price: "60.00", stock: 120, image: "spiral-notebook" },
  { id: "demo-pen-steel", sku: "DEMO-STN-002", name: "Steel ballpoint pen", description: "Brushed stainless steel ballpoint pen with a smooth blue-ink refill.", categoryId: "demo-cat-stationery", unit: "pcs", price: "249.00", stock: 8, image: "ballpoint-pen" },
  { id: "demo-stapler-green", sku: "DEMO-STN-003", name: "Desktop stapler", description: "Compact desktop stapler for assignments, reports and lab files.", categoryId: "demo-cat-stationery", unit: "pcs", price: "129.00", stock: 22, image: "stapler" },
  { id: "demo-calculator-sci", sku: "DEMO-ELC-001", name: "Scientific calculator", description: "Solar and battery scientific calculator with natural display for exams and labs.", categoryId: "demo-cat-electronics", unit: "pcs", price: "899.00", stock: 34, image: "scientific-calculator" },
  { id: "demo-usb-drive", sku: "DEMO-ELC-002", name: "USB-C flash drive", description: "Metal swivel USB-C flash drive for carrying reports and datasets.", categoryId: "demo-cat-electronics", unit: "pcs", price: "749.50", stock: 40, image: "usb-flash-drive" },
  { id: "demo-multimeter", sku: "DEMO-ELC-003", name: "Digital multimeter", description: "Handheld digital multimeter for voltage, current and resistance measurements.", categoryId: "demo-cat-electronics", unit: "pcs", price: "549.00", stock: 12, image: "digital-multimeter" },
  { id: "demo-uno-board", sku: "DEMO-ELC-004", name: "UNO-compatible microcontroller board", description: "Arduino UNO-compatible development board for electronics projects.", categoryId: "demo-cat-electronics", unit: "pcs", price: "699.00", stock: 3, image: "arduino-uno" },
  { id: "demo-goggles", sku: "DEMO-LAB-001", name: "Safety goggles", description: "Clear splash-resistant goggles with an adjustable elastic strap.", categoryId: "demo-cat-lab", unit: "pcs", price: "149.00", stock: 60, image: "safety-goggles" },
  { id: "demo-lab-coat", sku: "DEMO-LAB-002", name: "Lab coat", description: "White cotton laboratory coat with front pockets.", categoryId: "demo-cat-lab", unit: "pcs", price: "599.00", stock: 15, image: "lab-coat" },
  { id: "demo-beaker-100", sku: "DEMO-LAB-003", name: "Glass beaker, 100 ml", description: "Borosilicate low-form beaker with printed graduations.", categoryId: "demo-cat-lab", unit: "pcs", price: "85.00", stock: 200, image: "glass-beaker" },
  { id: "demo-microscope", sku: "DEMO-LAB-004", name: "Student compound microscope", description: "Student-grade compound microscope for slide work. Sample item to demonstrate an out-of-stock state.", categoryId: "demo-cat-lab", unit: "pcs", price: "4999.00", stock: 0, image: "microscope" },
  { id: "demo-water-bottle", sku: "DEMO-CMP-001", name: "Stainless steel water bottle", description: "Reusable stainless steel bottle with a screw cap and carry loop.", categoryId: "demo-cat-campus", unit: "pcs", price: "499.00", stock: 45, image: "water-bottle" },
];

/** Default low-stock threshold applied to demo stock (mirrors the workspace default). */
export const DEMO_DEFAULT_THRESHOLD = "10";
