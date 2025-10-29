
import { DinnerTypeId, DinnerType, EaterProfile } from './types';
import { UserIcon, FeatherIcon, FlameIcon } from './components/icons';


export const GENERAL_PRINCIPLES = `
1. Equilibrio nutricional
- Ligera pero completa: la cena no debe ser tan pesada como la comida, porque el cuerpo se prepara para descansar.
- Proteína de calidad: pescado, pollo, huevo, legumbres... favorecen la saciedad y ayudan a la recuperación nocturna.
- Verduras y hortalizas: aportan fibra, vitaminas y minerales, y ayudan a la digestión.
- Carbohidratos ligeros (si se necesita energía extra): arroz, patata cocida, pan integral... mejor en raciones moderadas.
- Evitar grasas pesadas (fritos, embutidos grasos) y azúcares rápidos, que dificultan el sueño.

2. Digestibilidad
- Cocción sencilla: al horno, a la plancha, al vapor o en guisos suaves.
- Evitar cenas muy copiosas o picantes que puedan causar reflujo o insomnio.
- Respetar un tiempo antes de dormir: lo ideal es cenar al menos 2 horas antes de acostarse.

3. Contexto y disfrute
- Buena presentación: platos cuidados, aunque sean sencillos, hacen que la experiencia sea más agradable.
- Ambiente: iluminación suave, mesa ordenada, música tranquila si apetece.
- Compañía: una cena compartida suele disfrutarse más que en soledad.

4. Organización práctica
- Planificación: pensar el menú con antelación para evitar improvisar comida poco saludable.
- Adaptar las raciones: mejor quedarse ligeramente satisfecho que sentir pesadez.
- Hidratarse: agua como bebida principal; evitar exceso de alcohol o refrescos azucarados.
`;

export const DINNER_TYPES: DinnerType[] = [
  {
    id: DinnerTypeId.LIGHT,
    title: 'Cena ligera y reparadora',
    objective: 'Facilitar la digestión y el descanso (para dormir bien).',
    guidelines: `
      - Verduras cocinadas (crema de calabacín, ensalada templada, espárragos a la plancha).
      - Proteína ligera (pescado blanco, tortilla francesa, pechuga de pollo).
      - Un poco de hidrato suave si lo necesitas (patata cocida, pan integral).
      - Infusión relajante (tila, manzanilla).
    `,
    preferredIngredients: [
        "Patata", "Zanahoria", "Cebolla", "Calabacín", "Puerro", "Judías verdes", "Huevos", "Pan integral", "Acelgas", "Col blanca", "Champiñones"
    ],
  },
  {
    id: DinnerTypeId.MUSCLE_RECOVERY,
    title: 'Recuperación muscular',
    objective: 'Reparar fibras musculares y reponer energía (tras entrenar).',
    guidelines: `
      - Proteína de calidad (salmón, huevos, legumbres, carne magra).
      - Verduras (para micronutrientes y fibra).
      - Carbohidrato complejo (arroz, pasta integral, boniato) para recargar glucógeno.
      - Agua o bebida isotónica natural.
    `,
    preferredIngredients: [
        "Huevos", "Pechuga de pollo", "Pavo", "Atún en lata", "Garbanzos", "Lentejas", "Arroz", "Pasta integral o normal", "Espinacas", "Brócoli", "Pimientos", "Soja texturizada", "Filetes de cerdo magro"
    ],
  },
  {
    id: DinnerTypeId.LOW_CALORIE,
    title: 'Cena baja en calorías',
    objective: 'Saciar sin exceso calórico (si buscas perder peso).',
    guidelines: `
      - Verduras en abundancia (ensaladas, wok ligero, sopas claras).
      - Proteína magra (pollo, claras de huevo, queso fresco).
      - Evitar carbohidratos pesados a la noche.
      - Fruta ligera como postre (kiwi, frutos rojos).
    `,
    preferredIngredients: [
        "Lechuga", "Tomate", "Pepino", "Calabacín", "Coliflor", "Zanahoria", "Pechuga de pollo", "Merluza congelada", "Queso fresco batido 0%", "Yogur natural", "Judías verdes", "Tofu económico"
    ],
  },
  {
    id: DinnerTypeId.ENERGETIC,
    title: 'Cena energética',
    objective: 'Cargar depósitos de glucógeno (si al día siguiente necesitas mucha energía temprano).',
    guidelines: `
      - Proteína (pavo, pescado, huevo).
      - Buen aporte de carbohidratos complejos (pasta, quinoa, pan integral).
      - Verduras para completar la digestión.
    `,
    preferredIngredients: [
        "Arroz", "Pasta", "Quinoa (económica a granel)", "Pan integral", "Avena", "Huevos", "Pollo", "Tomate", "Berenjena", "Calabacín", "Patata cocida", "Guisantes"
    ],
  },
  {
    id: DinnerTypeId.SOCIAL,
    title: 'Cena social o especial',
    objective: 'Disfrutar y compartir.',
    guidelines: `
      - Platos más elaborados, incluso con algún capricho (quesos, tapas, vino, postre).
      - Se busca más la experiencia que la optimización nutricional.
    `,
    preferredIngredients: [
        "Tortilla de patatas", "Pan con tomate", "Queso fresco", "Jamón cocido", "Champiñones", "Setas de cultivo", "Ensalada mixta (lechuga, tomate, cebolla)", "Sardinas", "Filetes de pollo", "Croquetas caseras", "Empanadillas al horno"
    ],
  },
];

export const EATER_PROFILES: EaterProfile[] = [
    {
        id: 'periquito',
        name: 'Periquito',
        multiplier: 0.75,
        description: 'Come un poco menos de lo habitual.',
        icon: FeatherIcon,
    },
    {
        id: 'humano',
        name: 'Humano',
        multiplier: 1.0,
        description: 'Una ración estándar.',
        icon: UserIcon,
    },
    {
        id: 'bestia-parda',
        name: 'Bestia Parda',
        multiplier: 1.5,
        description: 'Tiene un gran apetito.',
        icon: FlameIcon,
    }
];
