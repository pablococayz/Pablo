

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Modality } from "@google/genai";

// ============================================================================
// TYPES (from types.ts)
// ============================================================================

enum DinnerTypeId {
  LIGHT = 'light',
  MUSCLE_RECOVERY = 'muscle-recovery',
  LOW_CALORIE = 'low-calorie',
  ENERGETIC = 'energetic',
  SOCIAL = 'social',
  CUSTOM = 'custom', // For user-created recipes
}

interface DinnerType {
  id: DinnerTypeId;
  title: string;
  objective: string;
  guidelines: string;
  preferredIngredients?: string[];
}

interface RecipeIngredient {
  quantity: string;
  name:string;
}

interface Recipe {
  id: string;
  rating?: number;
  name: string;
  description: string;
  prepTime: number;
  costPerPerson: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  type: DinnerTypeId;
  source?: 'ai' | 'user'; // Distinguish between AI and user recipes
}

interface ShoppingListItem {
  name: string;
  quantity: string;
  category: string;
}

interface WeeklyPlan {
  weeklyRecipes: Recipe[];
  shoppingList: ShoppingListItem[];
}

type EaterProfileId = 'periquito' | 'humano' | 'bestia-parda';

interface EaterProfile {
  id: EaterProfileId;
  name: string;
  multiplier: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Diner {
  id: number;
  appetite: EaterProfileId;
}

// ============================================================================
// ICONS (from components/icons.tsx)
// ============================================================================

const ClockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EuroIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 15.879A6 6 0 0112.025 18c-3.314 0-6-2.686-6-6s2.686-6 6-6c1.657 0 3.155.672 4.243 1.757m-4.243 8.486L12.025 18m0 0l-2.828-2.828m2.828 2.828l2.828-2.828M6 12H4m16 0h-2M12 6V4m0 16v-2" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6.343 6.343l2.829 2.829m1.414-4.243l2.829-2.829m-4.243 1.414l-2.829-2.829m12.728 12.728l-2.829-2.829m4.243 1.414l-2.829 2.829m-1.414-4.243l2.829 2.829m-1.414-4.243l-2.829 2.829M19 12h-2M12 19v-2" />
    </svg>
);

const BackIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ClipboardListIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const FeatherIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9" />
    </svg>
);

const FlameIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c2-1 5-1 7-3 2 2 3 4 3 6-1 2-2 4-4 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.343 18.657a8 8 0 010-11.314" />
    </svg>
);

const BookmarkIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
);

const StarIcon = ({ className, fill = 'currentColor' }: { className?: string, fill?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill={fill} stroke="currentColor" strokeWidth="1">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const MagicWandIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6.343 6.343l2.829 2.829m1.414-4.243l2.829-2.829m-4.243 1.414l-2.829-2.829m12.728 12.728l-2.829-2.829m4.243 1.414l-2.829 2.829m-1.414-4.243l2.829 2.829m-1.414-4.243l-2.829 2.829M19 12h-2M12 19v-2" />
    </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

// ============================================================================
// CONSTANTS (from constants.ts)
// ============================================================================

const GENERAL_PRINCIPLES = `
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

const DINNER_TYPES: DinnerType[] = [
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

const EATER_PROFILES: EaterProfile[] = [
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

// ============================================================================
// GEMINI SERVICE (from services/geminiService.ts)
// ============================================================================

// Centralized AI instance
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "El nombre creativo y apetitoso del plato." },
    description: { type: Type.STRING, description: "Una descripción breve y atractiva del plato." },
    prepTime: { type: Type.INTEGER, description: "Tiempo total de preparación en minutos (debe ser 30 o menos)." },
    costPerPerson: { type: Type.NUMBER, description: "Costo estimado por persona en Euros (€) para una ración estándar (Humano). El valor DEBE ser inferior a 3." },
    ingredients: {
      type: Type.ARRAY,
      description: "Lista de ingredientes necesarios para la receta. Las cantidades DEBEN estar ajustadas para el número total de comensales y sus apetitos.",
      items: {
        type: Type.OBJECT,
        properties: {
          quantity: { type: Type.STRING, description: "Cantidad y unidad (ej. '100g', '1/2 unidad')." },
          name: { type: Type.STRING, description: "Nombre del ingrediente." },
        },
        required: ["quantity", "name"],
      },
    },
    instructions: {
      type: Type.ARRAY,
      description: "Instrucciones de preparación paso a paso.",
      items: {
        type: Type.STRING,
      },
    },
  },
  required: ["name", "description", "prepTime", "costPerPerson", "ingredients", "instructions"],
};

const weeklyPlanSchema = {
    type: Type.OBJECT,
    properties: {
        weeklyRecipes: {
            type: Type.ARRAY,
            description: "Una lista de 7 recetas de cena, una para cada día de la semana. Las cantidades de los ingredientes de cada receta deben estar ajustadas para el total de comensales.",
            items: recipeSchema,
        },
        shoppingList: {
            type: Type.ARRAY,
            description: "Una lista de la compra consolidada y categorizada con todos los ingredientes necesarios para las 7 recetas, con las cantidades totales ajustadas para todos los comensales durante toda la semana.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Nombre del ingrediente." },
                    quantity: { type: Type.STRING, description: "Cantidad total necesaria para la semana (ej. '500g', '3 unidades')." },
                    category: { type: Type.STRING, description: "Categoría del ingrediente (ej. 'Verduras y Hortalizas', 'Carnicería', 'Pescadería', 'Lácteos y Huevos', 'Despensa')." },
                },
                required: ["name", "quantity", "category"],
            },
        },
    },
    required: ["weeklyRecipes", "shoppingList"],
};

// FIX: Changed to a function declaration to resolve TSX parsing ambiguity with generics.
function parseGeminiJson<T>(jsonText: string | undefined, context: string): T {
    if (!jsonText) {
        console.error(`Error parsing JSON for ${context}: Response text is empty.`);
        throw new Error("La IA devolvió una respuesta vacía.");
    }

    let cleanedJson = jsonText.trim();
    if (cleanedJson.startsWith("```json")) {
        cleanedJson = cleanedJson.substring(7, cleanedJson.length - 3).trim();
    } else if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.substring(3, cleanedJson.length - 3).trim();
    }

    try {
        return JSON.parse(cleanedJson);
    } catch (e) {
        console.error(`Failed to parse JSON for ${context}. Raw text:`, cleanedJson, "Error:", e);
        throw new Error("La IA devolvió una respuesta con formato incorrecto. Por favor, inténtalo de nuevo.");
    }
}

const getDinersInfo = (diners: Diner[]) => {
    const totalMultiplier = diners.reduce((sum, diner) => {
        const profile = EATER_PROFILES.find(p => p.id === diner.appetite);
        return sum + (profile?.multiplier || 1);
    }, 0);

    const dinerComposition = EATER_PROFILES.map(profile => {
        const count = diners.filter(d => d.appetite === profile.id).length;
        return count > 0 ? `${count} ${profile.name} (x${profile.multiplier})` : null;
    }).filter(Boolean).join(', ');

    return { totalMultiplier, dinerComposition };
}

const getIngredientsPrompt = (dinnerType: DinnerType): string => {
    if (!dinnerType.preferredIngredients || dinnerType.preferredIngredients.length === 0) {
        return '';
    }

    const ingredientsList = dinnerType.preferredIngredients.join(', ');

    if (dinnerType.id === DinnerTypeId.SOCIAL) {
        return `
    **Inspiración de Ingredientes Económicos:**
    - Para esta cena especial, inspírate en esta lista de ingredientes para mantener un costo razonable sin sacrificar el sabor: ${ingredientsList}. Tienes libertad para añadir otros ingredientes que eleven el plato.
    `;
    }

    return `
    **Ingredientes Preferidos (MUY IMPORTANTE):**
    - La receta debe basarse y usar PRINCIPALMENTE ingredientes de esta lista, ya que son económicos, asequibles y familiares: **${ingredientsList}**.
    - Puedes añadir otros ingredientes complementarios (especias, aceite, sal, etc.) según sea necesario, pero el núcleo del plato debe centrarse en la lista proporcionada.
    `;
};

const generateRecipe = async (dinnerType: DinnerType, diners: Diner[]): Promise<Recipe> => {
  const { totalMultiplier, dinerComposition } = getDinersInfo(diners);
  const ingredientsPrompt = getIngredientsPrompt(dinnerType);

  const prompt = `
    Por favor, genera una receta de cena basada en los siguientes criterios:

    Tipo de Cena: "${dinnerType.title}"
    Objetivo: "${dinnerType.objective}"

    **INFORMACIÓN DE COMENSALES (MUY IMPORTANTE):**
    - Número total de personas: ${diners.length}
    - Composición: ${dinerComposition}
    - **Factor de ración total (equivalente a personas estándar): ${totalMultiplier.toFixed(2)}**

    ${ingredientsPrompt}

    La receta DEBE cumplir con las siguientes restricciones ESTRICTAS:
    - **Cantidades de ingredientes: TODAS las cantidades deben ser calculadas y ajustadas PRECISAMENTETE para el factor de ración total de ${totalMultiplier.toFixed(2)}.** La receta base es para 1 persona estándar (Humano). Multiplica las cantidades base por ${totalMultiplier.toFixed(2)}.
    - Tiempo de preparación: Máximo 30 minutos.
    - Costo: El costo por persona estándar (Humano) debe ser INFERIOR a 3 Euros (€).
    - Sabor: La receta debe ser deliciosa y apetitosa.
    - Creatividad: No repitas siempre las mismas recetas. Busca opciones originales y sabrosas.

    Utiliza estas guías nutricionales para inspirarte:
    Guías Específicas para "${dinnerType.title}":
    ${dinnerType.guidelines}

    Principios Generales para una Cena Ideal:
    ${GENERAL_PRINCIPLES}

    El resultado debe ser un único objeto JSON que se ajuste al esquema proporcionado. No incluyas ningún texto, explicación o formato markdown fuera del objeto JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        temperature: 0.8
      }
    });

    const recipeData = parseGeminiJson<any>(response.text, 'recipe');
    
    return { ...recipeData, type: dinnerType.id, id: self.crypto.randomUUID(), source: 'ai' };
  } catch (error) {
    console.error("Error generating recipe with Gemini:", error);
    if (error instanceof Error && (error.message.includes("formato incorrecto") || error.message.includes("respuesta vacía"))) {
        throw error;
    }
    throw new Error("No se pudo generar la receta. Por favor, inténtalo de nuevo.");
  }
};

const generateWeeklyPlan = async (dinnerTypes: DinnerType[], diners: Diner[]): Promise<WeeklyPlan> => {
    const { totalMultiplier, dinerComposition } = getDinersInfo(diners);
    
    const weeklyObjectivesPrompt = dinnerTypes.map((dinnerType, index) => {
        const dayOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][index];
        const ingredientsPrompt = getIngredientsPrompt(dinnerType);
        return `
    ---
    **Día: ${dayOfWeek}**
    - Tipo de Cena: "${dinnerType.title}"
    - Objetivo: "${dinnerType.objective}"
    ${ingredientsPrompt}
    - Guías Específicas: ${dinnerType.guidelines}
    ---
        `;
    }).join('\n');

    const prompt = `
      Por favor, genera un plan de cenas para una semana completa (7 días) y una lista de la compra consolidada, siguiendo los objetivos específicos para CADA DÍA.

      **INFORMACIÓN DE COMENSALES (MUY IMPORTANTE):**
      - Número total de personas: ${diners.length}
      - Composición: ${dinerComposition}
      - **Factor de ración total (equivalente a personas estándar): ${totalMultiplier.toFixed(2)}**

      **OBJETIVOS DIARIOS:**
      ${weeklyObjectivesPrompt}

      El plan DEBE cumplir con las siguientes restricciones ESTRICTAS para CADA RECETA:
      - **Cantidades de ingredientes: TODAS las cantidades, tanto en las recetas diarias como en la lista de la compra final, deben ser calculadas y ajustadas PRECISAMENTETE para el factor de ración total de ${totalMultiplier.toFixed(2)}.**
      - Lista de la compra: La lista debe ser CONSOLIDADA, sumando los ingredientes de las 7 recetas ya ajustadas.
      - Variedad: Las 7 recetas deben ser diferentes entre sí.
      - Tiempo de preparación: Máximo 30 minutos por cena.
      - Costo: El costo por persona estándar (Humano) para cada cena debe ser INFERIOR a 3 Euros (€).
      - Sabor: Todas las recetas deben ser deliciosas.

      Usa también estos Principios Generales para una Cena Ideal como guía:
      ${GENERAL_PRINCIPLES}

      El resultado debe ser un único objeto JSON que se ajuste al esquema proporcionado, conteniendo 'weeklyRecipes' y 'shoppingList'. No incluyas ningún texto fuera del JSON.
    `;

    try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: weeklyPlanSchema,
            temperature: 0.8
          }
        });
    
        const planData = parseGeminiJson<WeeklyPlan>(response.text, 'weekly plan');

        if (planData.weeklyRecipes && Array.isArray(planData.weeklyRecipes)) {
            planData.weeklyRecipes = planData.weeklyRecipes.map((recipe: Omit<Recipe, 'id' | 'type'>, index: number) => ({
                ...recipe,
                type: dinnerTypes[index].id,
                id: self.crypto.randomUUID(),
                source: 'ai',
            }));
        }
        
        return planData;
      } catch (error) {
        console.error("Error generating weekly plan with Gemini:", error);
        if (error instanceof Error && (error.message.includes("formato incorrecto") || error.message.includes("respuesta vacía"))) {
            throw error;
        }
        throw new Error("No se pudo generar el plan semanal. Por favor, inténtalo de nuevo.");
      }
};

const generateRecipeImage = async (recipe: Recipe): Promise<string> => {
    const prompt = `Fotografía de un plato de "${recipe.name}". Descripción: "${recipe.description}". La foto debe ser apetitosa, de estilo casero, bien iluminada, con un enfoque profesional y que se vea realista. El plato debe ser el protagonista y el fondo debe ser simple.`;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
  
      const inlineData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
      if (inlineData?.data) {
        return `data:image/png;base64,${inlineData.data}`;
      }
      
      console.error("No inlineData found in Gemini image response:", JSON.stringify(response, null, 2));
      throw new Error("La IA no devolvió datos de imagen válidos.");
    } catch (error) {
      console.error("Error generating recipe image with Gemini:", error);
      if (error instanceof Error && error.message.includes("datos de imagen válidos")) {
        throw error;
      }
      throw new Error("No se pudo generar la imagen del plato. Por favor, inténtalo de nuevo.");
    }
  };
  
const dataUrlToParts = (dataUrl: string): { mimeType: string; data: string } | null => {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
};

const editRecipeImage = async (base64ImageDataUrl: string, prompt: string): Promise<string> => {
    const imageParts = dataUrlToParts(base64ImageDataUrl);
    if (!imageParts) {
        throw new Error("Formato de imagen no válido. Solo se admiten URL de datos base64.");
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: imageParts.data,
                            mimeType: imageParts.mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const inlineData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
        if (inlineData?.data) {
            return `data:image/png;base64,${inlineData.data}`;
        }

        console.error("No inlineData found in Gemini image edit response:", JSON.stringify(response, null, 2));
        throw new Error("La IA no devolvió una imagen editada válida.");
    } catch (error) {
        console.error("Error editing recipe image with Gemini:", error);
        if (error instanceof Error && error.message.includes("imagen editada válida")) {
            throw error;
        }
        throw new Error("No se pudo editar la imagen del plato. Por favor, inténtalo de nuevo.");
    }
};

// ============================================================================
// APP COMPONENT (from App.tsx)
// ============================================================================

type Mode = 'single' | 'weekly';
type Screen = 'main' | 'saved';

const App: React.FC = () => {
  // Navigation state
  const [screen, setScreen] = useState<Screen>('main');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | 'new' | null>(null);

  // Main flow state
  const [mode, setMode] = useState<Mode | null>(null);
  const [selectedType, setSelectedType] = useState<DinnerType | null>(null);
  const [weeklyTypes, setWeeklyTypes] = useState<DinnerTypeId[]>(() => Array(7).fill(DINNER_TYPES[0].id));
  const [isWeeklyTypeSelectionDone, setIsWeeklyTypeSelectionDone] = useState(false);
  const [diners, setDiners] = useState<Diner[]>([{ id: Date.now(), appetite: 'humano' }]);
  
  // Results state
  const [singleRecipe, setSingleRecipe] = useState<Recipe | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // User recipes state (saved AI recipes + user-created recipes)
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

  // PWA install prompt state
  const [installPrompt, setInstallPrompt] = useState<any>(null);


  // Load recipes from localStorage on initial render
  useEffect(() => {
    try {
      const storedRecipes = localStorage.getItem('dinner-ai-user-recipes');
      if (storedRecipes) {
        setUserRecipes(JSON.parse(storedRecipes));
      }
    } catch (e) {
      console.error("Failed to load user recipes from localStorage", e);
    }
  }, []);

  // Save recipes to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('dinner-ai-user-recipes', JSON.stringify(userRecipes));
    } catch(e) {
      console.error("Failed to save recipes to localStorage", e);
    }
  }, [userRecipes]);

  // PWA install prompt handler
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      console.log('beforeinstallprompt event fired');
      setInstallPrompt(e);
    };
  
    window.addEventListener('beforeinstallprompt', handler);
  
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);


  const totalMultiplier = useMemo(() => diners.reduce((sum, diner) => {
    const profile = EATER_PROFILES.find(p => p.id === diner.appetite);
    return sum + (profile?.multiplier || 1);
  }, 0), [diners]);
  
  const handleGenerate = useCallback(async () => {
    if (!mode) return;
    if (mode === 'single' && !selectedType) return;

    setIsLoading(true);
    setError(null);
    setSingleRecipe(null);
    setWeeklyPlan(null);

    try {
      if (mode === 'single' && selectedType) {
        const newRecipe = await generateRecipe(selectedType, diners);
        setSingleRecipe(newRecipe);
      } else if (mode === 'weekly') {
        const dinnerTypesForWeek = weeklyTypes.map(typeId => DINNER_TYPES.find(dt => dt.id === typeId)!);
        const newPlan = await generateWeeklyPlan(dinnerTypesForWeek, diners);
        setWeeklyPlan(newPlan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, mode, diners, weeklyTypes]);

  const resetToModeSelection = () => {
    setMode(null);
    setSelectedType(null);
    setSingleRecipe(null);
    setWeeklyPlan(null);
    setError(null);
    setDiners([{ id: Date.now(), appetite: 'humano' }]);
    setIsWeeklyTypeSelectionDone(false);
    setScreen('main');
    setEditingRecipe(null);
    setRecipeToDelete(null);
  };

  const handleSaveRecipe = (recipeToSave: Omit<Recipe, 'id'>) => {
    setUserRecipes(prev => {
        if (editingRecipe && editingRecipe !== 'new') { // Editing existing recipe
            return prev.map(r => r.id === editingRecipe.id ? { ...r, ...recipeToSave, id: editingRecipe.id } : r);
        } else { // Creating new recipe
            const newRecipe: Recipe = {
                ...recipeToSave,
                id: self.crypto.randomUUID(),
                source: 'user',
                type: DinnerTypeId.CUSTOM,
            };
            return [...prev, newRecipe];
        }
    });
    setEditingRecipe(null);
    setScreen('saved');
  };

  const handleRateRecipe = (ratedRecipe: Recipe, newRating: number) => {
    const updatedRecipe = { ...ratedRecipe, rating: newRating };

    if (singleRecipe && singleRecipe.id === updatedRecipe.id) {
      setSingleRecipe(updatedRecipe);
    }
    if (weeklyPlan) {
      setWeeklyPlan(prevPlan => ({
        ...prevPlan!,
        weeklyRecipes: prevPlan!.weeklyRecipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r)
      }));
    }

    setUserRecipes(prevSaved => {
      const existingIndex = prevSaved.findIndex(r => r.id === updatedRecipe.id);
      const isCurrentlySaved = existingIndex > -1;

      if (newRating > 2.5) {
        if (isCurrentlySaved) {
          const newSaved = [...prevSaved];
          newSaved[existingIndex] = updatedRecipe;
          return newSaved;
        } else {
          return [...prevSaved, updatedRecipe];
        }
      } else {
        if (isCurrentlySaved) {
          if (prevSaved[existingIndex].source === 'user') {
            const newSaved = [...prevSaved];
            newSaved[existingIndex] = updatedRecipe;
            return newSaved;
          }
          return prevSaved.filter(r => r.id !== updatedRecipe.id);
        }
      }
      return prevSaved;
    });
  };
  
  const handleDeleteRecipe = (recipeId: string) => {
    setUserRecipes(prev => prev.filter(r => r.id !== recipeId));
    setRecipeToDelete(null);
  };

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      setInstallPrompt(null);
    });
  };

  const renderMainContent = () => {
    if(editingRecipe) {
        return <RecipeForm 
            initialRecipe={editingRecipe === 'new' ? null : editingRecipe}
            onSave={handleSaveRecipe}
            onCancel={() => setEditingRecipe(null)}
        />
    }

    if (singleRecipe) {
        return <RecipeDisplay recipe={singleRecipe} onBack={resetToModeSelection} totalMultiplier={totalMultiplier} onRate={handleRateRecipe} onEdit={() => setEditingRecipe(singleRecipe)} />;
    }
    if (weeklyPlan) {
        return <WeeklyPlanDisplay plan={weeklyPlan} onBack={resetToModeSelection} totalMultiplier={totalMultiplier} onRate={handleRateRecipe} onEdit={setEditingRecipe} />;
    }

    if (mode === 'single') {
        if (!selectedType) {
            return <TypeSelectionScreen setSelectedType={setSelectedType} onBackToModeSelection={resetToModeSelection} />;
        }
        return <DinerSelectionScreen mode={mode} onGenerate={handleGenerate} diners={diners} setDiners={setDiners} isLoading={isLoading} error={error} onBack={() => setSelectedType(null)} />;
    }
    
    if (mode === 'weekly') {
        if (!isWeeklyTypeSelectionDone) {
            return <WeeklyTypeSelectionScreen weeklyTypes={weeklyTypes} setWeeklyTypes={setWeeklyTypes} onContinue={() => setIsWeeklyTypeSelectionDone(true)} onBackToModeSelection={resetToModeSelection} />;
        }
        return <DinerSelectionScreen mode={mode} onGenerate={handleGenerate} diners={diners} setDiners={setDiners} isLoading={isLoading} error={error} onBack={() => setIsWeeklyTypeSelectionDone(false)} />;
    }
    
    return <ModeSelectionScreen onSelectMode={setMode} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="container mx-auto px-4 py-8 sm:py-12 flex-grow">
        <Header 
          onShowSaved={() => { setScreen('saved'); setEditingRecipe(null); }} 
          onShowMain={resetToModeSelection}
          installPrompt={installPrompt}
          onInstallClick={handleInstallClick}
        />
        {screen === 'main' && renderMainContent()}
        {screen === 'saved' && !editingRecipe && <SavedRecipesScreen recipes={userRecipes} onRate={handleRateRecipe} onBackToMain={() => setScreen('main')} onEdit={setEditingRecipe} onCreate={() => setEditingRecipe('new')} onDeleteRequest={setRecipeToDelete}/>}
        {editingRecipe && <RecipeForm initialRecipe={editingRecipe === 'new' ? null : editingRecipe} onSave={handleSaveRecipe} onCancel={() => setEditingRecipe(null)} />}
      
        {recipeToDelete && (
          <ConfirmationModal 
              recipe={recipeToDelete}
              onConfirm={() => handleDeleteRecipe(recipeToDelete.id)}
              onCancel={() => setRecipeToDelete(null)}
          />
        )}
      </main>
      <Footer />
    </div>
  );
};

const Header: React.FC<{ 
  onShowSaved: () => void; 
  onShowMain: () => void; 
  installPrompt: any;
  onInstallClick: () => void;
}> = ({ onShowSaved, onShowMain, installPrompt, onInstallClick }) => (
  <header className="text-center mb-10 relative">
    <h1 onClick={onShowMain} className="text-4xl sm:text-5xl font-bold text-gray-800 tracking-tight cursor-pointer">
      Generador de Cenas con <span className="text-indigo-600">IA</span>
    </h1>
    <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
      ¿Sin ideas para cenar? Elige tu objetivo, dinos quiénes sois y deja que la IA cree la magia.
    </p>
    <div className="absolute top-0 right-0 flex items-center gap-4">
        {installPrompt && (
            <button 
              onClick={onInstallClick}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg shadow-sm hover:bg-emerald-600 transition-colors"
              title="Instalar aplicación"
            >
                <DownloadIcon className="w-5 h-5" />
                <span>Instalar App</span>
            </button>
        )}
        <button onClick={onShowSaved} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-indigo-500 text-indigo-600 font-semibold rounded-lg shadow-sm hover:bg-indigo-50 transition-colors">
            <BookmarkIcon className="w-5 h-5" />
            Mis Recetas
        </button>
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="text-center py-6 px-4 mt-12 border-t border-gray-200">
    <p className="text-sm text-gray-500">
      Esta aplicación utiliza la API de Google Gemini. El uso moderado está cubierto por el{" "}
      <a 
        href="https://ai.google.dev/gemini-api/docs/pricing" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-indigo-600 hover:underline font-medium"
      >
        nivel gratuito de la API
      </a>.
    </p>
  </footer>
);

const ModeSelectionScreen: React.FC<{onSelectMode: (mode: Mode) => void}> = ({ onSelectMode }) => (
    <div className="max-w-2xl mx-auto text-center animate-fade-in">
        <h2 className="text-2xl font-semibold text-gray-700 mb-8">Paso 1: Para empezar, ¿qué necesitas?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ModeCard icon={<ClipboardListIcon className="w-12 h-12 text-indigo-500 mb-4" />} title="Cena Puntual" description="Genera una única receta deliciosa para esta noche." onClick={() => onSelectMode('single')} />
            <ModeCard icon={<CalendarIcon className="w-12 h-12 text-indigo-500 mb-4" />} title="Plan Semanal" description="Organiza tus cenas para toda la semana y obtén la lista de la compra." onClick={() => onSelectMode('weekly')} />
        </div>
    </div>
);

const ModeCard: React.FC<{icon: React.ReactNode; title: string; description: string; onClick: () => void;}> = ({ icon, title, description, onClick}) => (
    <div onClick={onClick} className="p-8 border-2 rounded-xl cursor-pointer bg-white hover:border-indigo-500 hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col items-center">
        {icon}
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <p className="mt-2 text-gray-600">{description}</p>
    </div>
);

const TypeSelectionScreen: React.FC<{ setSelectedType: (type: DinnerType) => void; onBackToModeSelection: () => void;}> = ({ setSelectedType, onBackToModeSelection }) => (
  <div className="animate-fade-in">
    <button onClick={onBackToModeSelection} className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 mb-6 max-w-4xl mx-auto">
        <BackIcon className="w-5 h-5 mr-2"/> Volver al paso anterior
    </button>
    <div className="text-center mb-8">
      <h2 className="text-2xl font-semibold text-gray-700">Paso 2: ¿Qué tipo de cena te apetece hoy?</h2>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {DINNER_TYPES.map((type) => ( <DinnerTypeCard key={type.id} type={type} onSelect={() => setSelectedType(type)} /> ))}
    </div>
  </div>
);

const DinnerTypeCard: React.FC<{type: DinnerType; onSelect: () => void}> = ({ type, onSelect }) => (
  <div onClick={onSelect} className={'p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 h-full flex flex-col border-gray-200 bg-white hover:border-indigo-400 hover:shadow-md'}>
    <h3 className="text-lg font-bold text-gray-800">{type.title}</h3>
    <p className="mt-2 text-sm text-gray-600">{type.objective}</p>
  </div>
);

const WeeklyTypeSelectionScreen: React.FC<{ weeklyTypes: DinnerTypeId[]; setWeeklyTypes: React.Dispatch<React.SetStateAction<DinnerTypeId[]>>; onContinue: () => void; onBackToModeSelection: () => void; }> = ({ weeklyTypes, setWeeklyTypes, onContinue, onBackToModeSelection }) => {
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const handleTypeChange = (dayIndex: number, typeId: DinnerTypeId) => {
        const newTypes = [...weeklyTypes];
        newTypes[dayIndex] = typeId;
        setWeeklyTypes(newTypes);
    };
    return (
        <div className="animate-fade-in max-w-3xl mx-auto">
            <button onClick={onBackToModeSelection} className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 mb-6">
                <BackIcon className="w-5 h-5 mr-2"/> Volver al paso anterior
            </button>
            <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-700">Paso 2: Configura tu plan semanal</h2>
                <p className="text-gray-600 mt-2">Elige un objetivo diferente para cada día de la semana.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-lg space-y-4">
                {daysOfWeek.map((day, index) => (
                    <div key={day} className="grid grid-cols-3 items-center gap-4 p-2 rounded-md hover:bg-gray-50">
                        <label htmlFor={`day-${index}`} className="font-semibold text-gray-800 text-lg col-span-1">{day}</label>
                        <select id={`day-${index}`} value={weeklyTypes[index]} onChange={(e) => handleTypeChange(index, e.target.value as DinnerTypeId)} className="col-span-2 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition">
                            {DINNER_TYPES.map(type => ( <option key={type.id} value={type.id}>{type.title}</option>))}
                        </select>
                    </div>
                ))}
            </div>
            <div className="text-center mt-8">
                <button onClick={onContinue} className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Siguiente: Elegir comensales
                </button>
            </div>
        </div>
    );
};

const DinerSelectionScreen: React.FC<{ mode: Mode; diners: Diner[]; setDiners: React.Dispatch<React.SetStateAction<Diner[]>>; onGenerate: () => void; isLoading: boolean; error: string | null; onBack: () => void; }> = ({ mode, diners, setDiners, onGenerate, isLoading, error, onBack}) => {
    const addDiner = () => setDiners(prev => [...prev, { id: Date.now(), appetite: 'humano' }]);
    const removeDiner = (id: number) => setDiners(prev => prev.filter(diner => diner.id !== id));
    const updateDinerAppetite = (id: number, appetite: EaterProfileId) => setDiners(prev => prev.map(diner => diner.id === id ? { ...diner, appetite } : diner));
    const totalMultiplier = useMemo(() => diners.reduce((sum, diner) => sum + (EATER_PROFILES.find(p => p.id === diner.appetite)?.multiplier || 1), 0), [diners]);
    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <button onClick={onBack} className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 mb-6">
                <BackIcon className="w-5 h-5 mr-2"/> Elegir otro tipo de {mode === 'single' ? 'cena' : 'plan'}
            </button>
            <div className="bg-white p-8 rounded-2xl shadow-lg">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-gray-700">Paso 3: ¿Quiénes vais a cenar?</h2>
                    <p className="text-gray-600 mt-2">Ajusta el número de personas y su apetito para calcular las cantidades perfectas.</p>
                </div>
                <div className="space-y-4 mb-6">
                    {diners.map((diner, index) => (
                        <div key={diner.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                            <span className="font-semibold text-gray-800">Persona {index + 1}</span>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    {EATER_PROFILES.map(profile => (
                                        <button key={profile.id} onClick={() => updateDinerAppetite(diner.id, profile.id)} className={`p-2 rounded-full transition-all duration-200 ${diner.appetite === profile.id ? 'bg-indigo-600 text-white scale-110 shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`} title={profile.name}>
                                            <profile.icon className="w-5 h-5"/>
                                        </button>
                                    ))}
                                </div>
                                {diners.length > 1 && ( <button onClick={() => removeDiner(diner.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /> </svg> </button> )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center mb-10">
                    <button onClick={addDiner} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">Añadir Persona</button>
                    <div className="text-right">
                        <p className="font-semibold text-gray-800">Total: {diners.length} persona{diners.length > 1 && 's'}</p>
                        <p className="text-sm text-gray-600">Equivale a {totalMultiplier.toFixed(2)} raciones estándar</p>
                    </div>
                </div>
                <div className="text-center">
                    <button onClick={onGenerate} disabled={isLoading} className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-lg">
                        {isLoading ? (<> <Spinner /> Generando... </>) : (<> <SparklesIcon className="w-6 h-6 mr-3" /> {mode === 'single' ? 'Generar mi Receta' : 'Generar Plan Semanal'} </>)}
                    </button>
                    {error && <p className="mt-4 text-red-600 font-medium">{error}</p>}
                </div>
            </div>
        </div>
    );
};

const StarRating: React.FC<{ rating: number; onRate: (rating: number) => void; }> = ({ rating, onRate }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const stars = [1, 2, 3, 4, 5];
  
    return (
        <div className="flex items-center space-x-0.5" onMouseLeave={() => setHoverRating(0)}>
            {stars.map((starValue) => (
                <div
                    key={starValue}
                    className="relative cursor-pointer"
                    aria-label={`Valorar con ${starValue} estrellas`}
                >
                    <StarIcon className="w-8 h-8 text-gray-300" />
                    <div
                        className="absolute top-0 left-0 h-full overflow-hidden"
                        style={{ width: `${(hoverRating || rating) >= starValue ? '100%' : (hoverRating || rating) > starValue - 0.5 ? '50%' : '0%'}` }}
                    >
                        <StarIcon className="w-8 h-8 text-amber-400" />
                    </div>
                    <div 
                        className="absolute top-0 left-0 w-1/2 h-full" 
                        onMouseEnter={() => setHoverRating(starValue - 0.5)}
                        onClick={() => onRate(starValue - 0.5)}
                        role="button"
                        aria-label={`Valorar con ${starValue - 0.5} estrellas`}
                    />
                    <div 
                        className="absolute top-0 right-0 w-1/2 h-full" 
                        onMouseEnter={() => setHoverRating(starValue)}
                        onClick={() => onRate(starValue)}
                        role="button"
                        aria-label={`Valorar con ${starValue} estrellas`}
                    />
                </div>
            ))}
        </div>
    );
};


const RecipeDisplay: React.FC<{ recipe: Recipe; onBack?: () => void; totalMultiplier?: number; onRate: (recipe: Recipe, rating: number) => void; onEdit: (recipe: Recipe) => void; }> = ({ recipe, onBack, totalMultiplier, onRate, onEdit }) => {
  const totalCost = totalMultiplier ? recipe.costPerPerson * totalMultiplier : null;
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setImageError(null);
    setEditError(null);
    try {
        const imageUrl = await generateRecipeImage(recipe);
        setGeneratedImage(imageUrl);
    } catch(err) {
        setImageError(err instanceof Error ? err.message : 'Ocurrió un error desconocido al generar la imagen.');
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handleEditImage = async () => {
    if (!generatedImage || !editPrompt) return;

    setIsEditingImage(true);
    setEditError(null);
    setImageError(null);
    try {
      const newImageUrl = await editRecipeImage(generatedImage, editPrompt);
      setGeneratedImage(newImageUrl);
      setEditPrompt('');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Ocurrió un error desconocido al editar la imagen.');
    } finally {
      setIsEditingImage(false);
    }
  };


  return (
    <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl max-w-3xl mx-auto animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            {onBack && ( <button onClick={onBack} className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800"> <BackIcon className="w-5 h-5 mr-2"/> Empezar de nuevo </button> )}
            <button onClick={() => onEdit(recipe)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-200 transition-colors text-sm">
                <EditIcon className="w-4 h-4" />
                Editar
            </button>
        </div>
      <h2 className="text-3xl font-bold text-gray-900">{recipe.name}</h2>
      <p className="mt-2 text-gray-600">{recipe.description}</p>
      
      <div className="my-6 text-center bg-gray-50 p-6 rounded-lg">
        {isGeneratingImage && !generatedImage ? (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg">
                <Spinner />
                <p className="mt-3 font-semibold text-gray-700">Generando tu imagen...</p>
                <p className="text-sm text-gray-500">Esto puede tardar unos segundos.</p>
            </div>
        ) : generatedImage ? (
            <div className="animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">¡Así podría quedar tu plato!</h3>
                <div className="relative">
                    <img src={generatedImage} alt={`Imagen generada por IA para ${recipe.name}`} className="w-full h-auto object-cover rounded-lg shadow-lg border-4 border-white" />
                    {isEditingImage && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg text-white">
                            <Spinner />
                            <span className="mt-2 font-semibold">Editando con IA...</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 space-y-3 text-left">
                    <label htmlFor="edit-prompt" className="block text-sm font-medium text-gray-700">¿Quieres cambiar algo? Edita la imagen con IA:</label>
                    <div className="flex gap-2">
                        <input
                            id="edit-prompt"
                            type="text"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="Ej: Añade un filtro retro, pon un fondo de madera..."
                            className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={isEditingImage}
                        />
                        <button
                            onClick={handleEditImage}
                            disabled={isEditingImage || !editPrompt.trim()}
                            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all"
                        >
                           <MagicWandIcon className="w-5 h-5 mr-2"/>
                           Aplicar
                        </button>
                    </div>
                     {editError && <p className="mt-2 text-sm text-red-600">{editError}</p>}
                </div>
            </div>
        ) : (
            <button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
                <ImageIcon className="w-5 h-5 mr-2" /> Generar imagen del plato (IA)
            </button>
        )}
        {(imageError && !isEditingImage) && <p className="mt-3 text-sm text-red-600 font-medium">{imageError}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 mt-6 border-t border-b border-gray-200 py-4">
        <div className="flex items-center gap-x-6">
            <div className="flex items-center text-gray-700"> <ClockIcon className="w-5 h-5 mr-2 text-indigo-500" /> <span className="font-medium">{recipe.prepTime} min</span> </div>
            <div className="flex items-center text-gray-700"> <EuroIcon className="w-5 h-5 mr-2 text-indigo-500" /> <span className="font-medium">{totalCost ? `${totalCost.toFixed(2)}€ en total` : `${recipe.costPerPerson.toFixed(2)}€ / persona`}</span> </div>
        </div>
        <div> <StarRating rating={recipe.rating || 0} onRate={(newRating) => onRate(recipe, newRating)} /> </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-1">
          <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2">Ingredientes</h3>
          <ul className="mt-4 space-y-3">
            {Array.isArray(recipe.ingredients) && recipe.ingredients.map((ing, index) => ( <li key={index} className="flex"> <span className="text-indigo-500 font-bold mr-2">›</span> <span className="text-gray-700"><span className="font-semibold">{ing.quantity}</span> {ing.name}</span> </li> ))}
          </ul>
        </div>
        <div className="md:col-span-2">
          <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2">Preparación</h3>
          <ol className="mt-4 space-y-4">
            {Array.isArray(recipe.instructions) && recipe.instructions.map((step, index) => ( <li key={index} className="flex items-start"> <span className="flex-shrink-0 bg-indigo-600 text-white font-bold rounded-full w-6 h-6 text-sm flex items-center justify-center mr-4 mt-1">{index + 1}</span> <p className="text-gray-700">{step}</p> </li> ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

const WeeklyPlanDisplay: React.FC<{plan: WeeklyPlan, onBack: () => void, totalMultiplier: number, onRate: (recipe: Recipe, rating: number) => void; onEdit: (recipe: Recipe) => void;}> = ({ plan, onBack, totalMultiplier, onRate, onEdit }) => {
    const groupedShoppingList = useMemo(() => {
        if (!plan.shoppingList) return {};
        return plan.shoppingList.reduce((acc, item) => {
            const category = item.category || 'Varios';
            (acc[category] = acc[category] || []).push(item);
            return acc;
        }, {} as Record<string, ShoppingListItem[]>);
    }, [plan.shoppingList]);
    return (
        <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl max-w-5xl mx-auto animate-fade-in">
            <button onClick={onBack} className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800 mb-6"> <BackIcon className="w-5 h-5 mr-2"/> Empezar de nuevo </button>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Tu Plan de Cenas Semanal</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <h3 className="text-2xl font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2 mb-6">Recetas de la Semana</h3>
                    <div className="space-y-6">
                        {Array.isArray(plan.weeklyRecipes) && plan.weeklyRecipes.map((recipe, index) => (
                            <details key={recipe.id} className="p-4 border rounded-lg bg-gray-50/50 open:bg-white open:shadow-md transition-all">
                                <summary className="font-semibold text-lg cursor-pointer text-gray-800 flex justify-between items-center">
                                    <span>Día {index + 1}: <span className="text-indigo-700">{recipe.name}</span></span>
                                    <div className="flex items-center gap-1 text-amber-500">
                                        {recipe.rating ? <> <StarIcon className="w-5 h-5" /> <span>{recipe.rating}</span> </> : ''}
                                    </div>
                                </summary>
                                <div className="mt-4"> <RecipeDisplay recipe={recipe} totalMultiplier={totalMultiplier} onRate={onRate} onEdit={onEdit} /> </div>
                            </details>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-semibold text-gray-800 border-b-2 border-indigo-500 pb-2 mb-6 sticky top-4 bg-white/80 backdrop-blur-sm py-2">Lista de la Compra</h3>
                    <div className="space-y-6">
                        {Object.entries(groupedShoppingList).map(([category, items]) => (
                            <div key={category}>
                                <h4 className="font-bold text-lg text-gray-700 mb-3">{category}</h4>
                                <ul className="space-y-2">
                                    {items.map((item, index) => ( <li key={index} className="flex items-center"> <input type="checkbox" id={`${category}-${index}`} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-3" /> <label htmlFor={`${category}-${index}`} className="text-gray-700"> <span className="font-semibold">{item.quantity}</span> {item.name} </label> </li> ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SavedRecipesScreen: React.FC<{ recipes: Recipe[]; onRate: (recipe: Recipe, rating: number) => void; onBackToMain: () => void; onEdit: (recipe: Recipe) => void; onCreate: () => void; onDeleteRequest: (recipe: Recipe) => void; }> = ({ recipes, onRate, onBackToMain, onEdit, onCreate, onDeleteRequest }) => {
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

    if (selectedRecipe) {
        return <RecipeDisplay recipe={selectedRecipe} onRate={onRate} onBack={() => setSelectedRecipe(null)} onEdit={onEdit} />;
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBackToMain} className="flex items-center text-indigo-600 font-semibold hover:text-indigo-800">
                    <BackIcon className="w-5 h-5 mr-2" /> Volver al generador
                </button>
                <button onClick={onCreate} className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105">
                    Crear Nueva Receta
                </button>
            </div>
            <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-700">Mis Recetas</h2>
                <p className="text-gray-600 mt-2">Recetas guardadas de la IA y las que has creado tú.</p>
            </div>
            {recipes.length === 0 ? (
                <p className="text-center text-gray-500 bg-white p-8 rounded-xl shadow">Aún no tienes recetas. ¡Genera y puntúa una o crea la tuya para empezar!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recipes.sort((a, b) => (b.rating || 0) - (a.rating || 0)).map(recipe => (
                        <div key={recipe.id} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-transform duration-300 relative group">
                           <div onClick={() => setSelectedRecipe(recipe)} className="cursor-pointer">
                                <h3 className="text-xl font-bold text-gray-800">{recipe.name}</h3>
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{recipe.description}</p>
                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                    <div className="flex items-center text-amber-500">
                                        <StarIcon className="w-6 h-6 mr-1" />
                                        <span className="font-bold text-lg">{recipe.rating?.toFixed(1) || '-'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <ClockIcon className="w-4 h-4 mr-1" />
                                        <span>{recipe.prepTime} min</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRequest(recipe);
                                }}
                                className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                aria-label={`Eliminar ${recipe.name}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const RecipeForm: React.FC<{ initialRecipe: Recipe | null; onSave: (recipe: Omit<Recipe, 'id'>) => void; onCancel: () => void; }> = ({ initialRecipe, onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [prepTime, setPrepTime] = useState('');
    const [costPerPerson, setCostPerPerson] = useState('');
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([{ quantity: '', name: '' }]);
    const [instructions, setInstructions] = useState<string[]>(['']);

    useEffect(() => {
        if (initialRecipe) {
            setName(initialRecipe.name);
            setDescription(initialRecipe.description);
            setPrepTime(String(initialRecipe.prepTime || ''));
            setCostPerPerson(String(initialRecipe.costPerPerson || ''));
            setIngredients(initialRecipe.ingredients.length > 0 ? initialRecipe.ingredients : [{ quantity: '', name: '' }]);
            setInstructions(initialRecipe.instructions.length > 0 ? initialRecipe.instructions : ['']);
        } else {
            setName('');
            setDescription('');
            setPrepTime('');
            setCostPerPerson('');
            setIngredients([{ quantity: '', name: '' }]);
            setInstructions(['']);
        }
    }, [initialRecipe]);

    const handleIngredientChange = (index: number, field: keyof RecipeIngredient, value: string) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };
    const addIngredient = () => setIngredients([...ingredients, { quantity: '', name: '' }]);
    const removeIngredient = (index: number) => setIngredients(ingredients.filter((_, i) => i !== index));

    const handleInstructionChange = (index: number, value: string) => {
        const newInstructions = [...instructions];
        newInstructions[index] = value;
        setInstructions(newInstructions);
    };
    const addInstruction = () => setInstructions([...instructions, '']);
    const removeInstruction = (index: number) => setInstructions(instructions.filter((_, i) => i !== index));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanedIngredients = ingredients.filter(ing => ing.name.trim() !== '' || ing.quantity.trim() !== '');
        const cleanedInstructions = instructions.filter(step => step.trim() !== '');
        onSave({ 
            name, 
            description, 
            prepTime: Number(prepTime) || 0, 
            costPerPerson: Number(costPerPerson) || 0, 
            ingredients: cleanedIngredients, 
            instructions: cleanedInstructions, 
            type: DinnerTypeId.CUSTOM 
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl max-w-3xl mx-auto animate-fade-in space-y-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center">{initialRecipe ? 'Editar Receta' : 'Crear Nueva Receta'}</h2>
            
            <div className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Plato</label>
                    <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
                    <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700">Tiempo (min)</label>
                        <input type="number" min="0" id="prepTime" value={prepTime} onChange={e => setPrepTime(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="cost" className="block text-sm font-medium text-gray-700">Coste por Persona (€)</label>
                        <input type="number" min="0" id="cost" value={costPerPerson} step="0.01" onChange={e => setCostPerPerson(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-800">Ingredientes</h3>
                <div className="space-y-3 mt-4">
                    {ingredients.map((ing, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input type="text" placeholder="Cantidad" value={ing.quantity} onChange={e => handleIngredientChange(index, 'quantity', e.target.value)} className="w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            <input type="text" placeholder="Nombre" value={ing.name} onChange={e => handleIngredientChange(index, 'name', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            <button type="button" onClick={() => removeIngredient(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100">&times;</button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addIngredient} className="mt-4 px-3 py-1.5 text-sm bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">+ Añadir Ingrediente</button>
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-800">Preparación</h3>
                 <div className="space-y-3 mt-4">
                    {instructions.map((step, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <span className="mt-2 font-bold text-gray-500">{index + 1}.</span>
                            <textarea value={step} onChange={e => handleInstructionChange(index, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" rows={2} />
                             <button type="button" onClick={() => removeInstruction(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 mt-1">&times;</button>
                        </div>
                    ))}
                 </div>
                 <button type="button" onClick={addInstruction} className="mt-4 px-3 py-1.5 text-sm bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">+ Añadir Paso</button>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors">Guardar Receta</button>
            </div>
        </form>
    );
};

const ConfirmationModal: React.FC<{
    recipe: Recipe;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ recipe, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center mx-4">
            <h3 className="text-xl font-bold text-gray-800">Confirmar Eliminación</h3>
            <p className="mt-4 text-gray-600">
                ¿Estás seguro de que quieres eliminar la receta "<strong>{recipe.name}</strong>"? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-center gap-4 mt-8">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
                    Cancelar
                </button>
                <button onClick={onConfirm} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-lg hover:bg-red-700 transition-colors">
                    Eliminar
                </button>
            </div>
        </div>
    </div>
);


const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
`;
document.head.appendChild(style);


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);