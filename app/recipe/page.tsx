import Link from "next/link";
import { db } from "@/lib/db";
import { pantryItems, recipesCache, localSwaps as localSwapsTable } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ingredientsHash, generateRecipe } from "@/lib/gemini";
import { loadProfile, profileHash, profilePromptContext } from "@/lib/profile";
import IngredientPicker, { type PickerItem } from "@/components/IngredientPicker";

export default async function RecipePage({
  searchParams,
}: {
  searchParams: Promise<{ ingredients?: string; bust?: string }>;
}) {
  const { ingredients: ingredientParam, bust } = await searchParams;

  if (!ingredientParam) {
    let pantry: (typeof pantryItems.$inferSelect)[] = [];
    try {
      pantry = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();
    } catch {}

    const now = Date.now();
    const pickerItems: PickerItem[] = pantry.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      isLocal: p.isLocal,
      daysUntilExpiry: Math.floor((p.expiryDate.getTime() - now) / 86_400_000),
    }));

    return (
      <main style={{ background: 'var(--paper)', minHeight: '100vh' }}>
        {/* Black ribbon */}
        <div style={{
          background: '#000', color: '#fff',
          padding: '10px 32px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>RECIPE · PICK INGREDIENTS</span>
          <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>WASTE LESS. EAT WELL.</span>
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px' }} className="recipe-container">
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'var(--caption)', marginBottom: 8,
            }}>
              VAR · 02 · COOK FROM PANTRY
            </div>
            <h1 style={{
              fontFamily: "'Source Serif 4', serif",
              fontWeight: 600, fontSize: 44, lineHeight: 1.0,
              letterSpacing: '-0.02em',
              margin: '0 0 8px',
            }}>
              What are we cooking?
            </h1>
            <p style={{
              fontFamily: 'Lora, serif', fontSize: 16,
              color: 'var(--caption)', margin: 0,
            }}>
              Pick the ingredients you want to use. Dying items are pre-selected.
            </p>
          </div>

          {pickerItems.length === 0 ? (
            <div style={{
              border: '2px solid #000', padding: '40px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: 22, fontWeight: 600, marginBottom: 8,
              }}>
                Your pantry is empty.
              </div>
              <p style={{
                fontFamily: 'Lora, serif', fontSize: 15,
                color: 'var(--caption)', margin: '0 0 20px',
              }}>
                Snap a photo of your fridge first.
              </p>
              <Link href="/" style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 700,
                fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '10px 18px', border: '2px solid #000',
                background: '#000', color: '#fff',
                textDecoration: 'none', display: 'inline-block',
              }}>
                ← BACK TO PANTRY
              </Link>
            </div>
          ) : (
            <IngredientPicker items={pickerItems} />
          )}
        </div>
        <style>{`
          @media (max-width: 768px) {
            .recipe-container { padding: 24px 16px !important; }
          }
        `}</style>
      </main>
    );
  }

  const ingredients = ingredientParam.split(",").map((s) => s.trim()).filter(Boolean);

  const profile = loadProfile();
  const pHash = profileHash(profile);
  const hash = ingredientsHash(ingredients) + (pHash ? `:${pHash}` : "");

  let recipe;
  const forceRefresh = bust === "1";
  if (!forceRefresh) {
    const cached = db.select().from(recipesCache).where(eq(recipesCache.ingredientsHash, hash)).get();
    if (cached) recipe = JSON.parse(cached.recipeJson);
  }
  if (!recipe) {
    recipe = await generateRecipe(ingredients, profilePromptContext(profile));
    db.insert(recipesCache)
      .values({ ingredientsHash: hash, recipeJson: JSON.stringify(recipe) })
      .onConflictDoUpdate({ target: recipesCache.ingredientsHash, set: { recipeJson: JSON.stringify(recipe) } })
      .run();
  }

  const savedItems: string[] = recipe.saves ?? ingredients.slice(0, 3);

  // Match saved ingredients against NM local producers
  const allSwaps = db.select().from(localSwapsTable).all();
  const buyLocal = savedItems.flatMap((name: string) => {
    const nameLower = name.toLowerCase();
    const match = allSwaps.find(
      (s) =>
        nameLower.includes(s.genericName.toLowerCase()) ||
        s.genericName.toLowerCase().includes(nameLower)
    );
    return match
      ? [{ ingredient: name, producer: match.localProducer, product: match.product, store: match.whereToBuy }]
      : [];
  });
  const itemsSaved = savedItems.length;

  return (
    <main style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      {/* Black ribbon */}
      <div style={{
        background: '#000', color: '#fff',
        padding: '10px 32px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>RECIPE · GENERATED BY PANTRYOS</span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>WASTE LESS. EAT WELL.</span>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px' }} className="recipe-container">

        {/* Kicker */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          color: itemsSaved > 0 ? 'var(--dying)' : 'var(--caption)',
          marginBottom: 12,
        }}>
          SAVES {itemsSaved} PANTRY {itemsSaved === 1 ? 'ITEM' : 'ITEMS'}
          {recipe.timeMinutes ? ` · ${recipe.timeMinutes} MIN` : ''}
          {recipe.caloriesMin && recipe.caloriesMax ? ` · ~${recipe.caloriesMin}–${recipe.caloriesMax} CAL / SERVING` : ''}
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Source Serif 4', serif",
          fontWeight: 600, fontSize: 48, lineHeight: 1.0,
          letterSpacing: '-0.02em',
          margin: '0 0 24px',
          color: 'var(--ink)',
        }}>
          {recipe.title}
        </h1>

        {/* Hairline divider */}
        <div style={{ borderBottom: '2px solid #000', marginBottom: 32 }} />

        {/* Two-column layout on desktop */}
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }} className="recipe-columns">

          {/* Ingredients — 1/3 */}
          <div style={{ flex: '0 0 220px' }} className="recipe-ingredients">
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'var(--caption)', marginBottom: 16,
            }}>
              INGREDIENTS
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recipe.ingredients.map((ing: string, i: number) => (
                <li key={i} style={{
                  fontFamily: 'Lora, serif',
                  fontSize: 15, lineHeight: 1.5,
                  color: 'var(--ink)',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--hairline)',
                }}>
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          {/* Steps — 2/3 */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'var(--caption)', marginBottom: 16,
            }}>
              METHOD
            </div>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {recipe.steps.map((step: string, i: number) => (
                <li key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{
                    fontFamily: "'Source Serif 4', serif",
                    fontWeight: 600, fontSize: 20,
                    color: 'var(--caption)',
                    lineHeight: 1.3,
                    minWidth: 28,
                    flexShrink: 0,
                  }}>
                    {i + 1}.
                  </span>
                  <span style={{
                    fontFamily: 'Lora, serif',
                    fontSize: 16, lineHeight: 1.6,
                    color: 'var(--ink)',
                  }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            {/* Saves note */}
            {savedItems.length > 0 && (
              <div style={{
                marginTop: 32,
                borderTop: '1px solid var(--hairline)',
                paddingTop: 16,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, letterSpacing: '0.08em',
                color: 'var(--dying)',
              }}>
                SAVES: {savedItems.join(', ')}
              </div>
            )}

            {/* Buy Local — NM producers for ingredients in this recipe */}
            {buyLocal.length > 0 && (
              <div style={{
                marginTop: 24,
                border: '2px solid #057dbc',
                padding: '16px 20px',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  color: '#057dbc', marginBottom: 12,
                }}>
                  ◉ BUY LOCAL · NEW MEXICO PRODUCERS
                </div>
                {buyLocal.map((s, i) => (
                  <div key={i} style={{
                    borderBottom: i < buyLocal.length - 1 ? '1px solid #d1e9f5' : 'none',
                    padding: '8px 0',
                    fontFamily: 'Lora, serif',
                    fontSize: 14,
                    color: '#1a1a1a',
                  }}>
                    <span style={{ fontWeight: 700 }}>{s.ingredient}</span>
                    {' → '}
                    <span style={{ fontWeight: 700 }}>{s.producer}</span>
                    {' · '}
                    {s.product}
                    {' at '}
                    <span style={{ fontWeight: 700 }}>{s.store}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Back links */}
        <div style={{
          marginTop: 48, borderTop: '1px solid var(--hairline)', paddingTop: 24,
          display: 'flex', gap: 12, flexWrap: 'wrap',
        }}>
          <Link href="/recipe" style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700,
            fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '10px 18px', border: '2px solid #000',
            background: '#000', color: '#fff',
            textDecoration: 'none', display: 'inline-block',
          }}>
            ← PICK DIFFERENT INGREDIENTS
          </Link>
          <Link href="/" style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 700,
            fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '10px 18px', border: '2px solid #000',
            background: '#fff', color: '#000',
            textDecoration: 'none', display: 'inline-block',
          }}>
            BACK TO PANTRY
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .recipe-container { padding: 24px 16px !important; }
          .recipe-columns { flex-direction: column !important; gap: 32px !important; }
          .recipe-ingredients { flex: 0 0 auto !important; width: 100% !important; }
          h1 { font-size: 34px !important; }
        }
      `}</style>
    </main>
  );
}
