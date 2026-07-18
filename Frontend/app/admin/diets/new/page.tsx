import Link from "next/link";
import { DietEditor } from "@/components/admin/DietEditor";

export default function NewDietPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/diets" className="text-sm font-medium text-blue-600 hover:underline">
          ← Todas las dietas
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Nueva dieta</h1>
      </div>
      <DietEditor mode="create" diet={null} foods={[]} />
    </div>
  );
}
