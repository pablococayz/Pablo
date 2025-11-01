import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DinnerType, Diner, Recipe, WeeklyPlan, DinnerTypeId } from '../types';
import { EATER_PROFILES, GENERAL_PRINCIPLES } from "../constants";

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

export const generateRecipe = async (dinnerType: DinnerType, diners: Diner[]): Promise<Recipe> => {
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

export const generateWeeklyPlan = async (dinnerTypes: DinnerType[], diners: Diner[]): Promise<WeeklyPlan> => {
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

export const generateRecipeImage = async (recipe: Recipe): Promise<string> => {
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
  
export const dataUrlToParts = (dataUrl: string): { mimeType: string; data: string } | null => {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2] };
};

export const editRecipeImage = async (base64ImageDataUrl: string, prompt: string): Promise<string> => {
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
