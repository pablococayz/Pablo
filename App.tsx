
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DINNER_TYPES, EATER_PROFILES } from './constants';
import { DinnerType, Recipe, WeeklyPlan, ShoppingListItem, Diner, EaterProfileId, DinnerTypeId, RecipeIngredient } from './types';
import { generateRecipe, generateWeeklyPlan, generateRecipeImage, editRecipeImage } from './services/geminiService';
import { ClockIcon, EuroIcon, SparklesIcon, BackIcon, CalendarIcon, ClipboardListIcon, BookmarkIcon, StarIcon, EditIcon, TrashIcon, ImageIcon, MagicWandIcon, DownloadIcon } from './components/icons';

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

    // Update the recipe in the current view
    if (singleRecipe && singleRecipe.id === updatedRecipe.id) {
      setSingleRecipe(updatedRecipe);
    }
    if (weeklyPlan) {
      setWeeklyPlan(prevPlan => ({
        ...prevPlan!,
        weeklyRecipes: prevPlan!.weeklyRecipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r)
      }));
    }

    // Update user recipes list
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
           // If it's a user-created recipe, just update the rating, don't remove it
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
      setInstallPrompt(null); // The prompt can only be used once.
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
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8 sm:py-12">
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
      setEditPrompt(''); // Clear prompt on success
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
            
            {/* Basic Info */}
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

            {/* Ingredients */}
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

            {/* Instructions */}
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

            {/* Actions */}
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

export default App;