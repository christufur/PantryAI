import Link from "next/link";
import { db } from "@/lib/db";
import { pantryItems } from "@/db/schema";
import { asc } from "drizzle-orm";
import IngredientPicker, { type PickerItem } from "@/components/IngredientPicker";

/**
 * Ingredient picker only. Recipe results are served from `app/recipe/dish/page.tsx`;
 * middleware rewrites `/recipe?ingredients=…` there so client navigations do not reuse
 * this component name for the heavy AI branch (avoids dev `Performance.measure` glitch).
 */
export default async function RecipePage() {
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
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-ribbon)", fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>RECIPE · PICK INGREDIENTS</span>
        <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 10 }}>WASTE LESS. EAT WELL.</span>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px' }} className="recipe-container">
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'var(--caption)', marginBottom: 8,
          }}>
            VAR · 02 · COOK FROM PANTRY
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600, fontSize: "var(--text-title)", lineHeight: 1.0,
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
          }}>
            What are we cooking?
          </h1>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "var(--text-md)",
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
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-card-name)", fontWeight: 600, marginBottom: 8,
            }}>
              Your pantry is empty.
            </div>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "var(--text-sm)",
              color: 'var(--caption)', margin: '0 0 20px',
            }}>
              Snap a photo of your fridge first.
            </p>
            <Link href="/" style={{
              fontFamily: "var(--font-ui)", fontWeight: 700,
              fontSize: "var(--text-ribbon)", textTransform: 'uppercase', letterSpacing: '0.08em',
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
