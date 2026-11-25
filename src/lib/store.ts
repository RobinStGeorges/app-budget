// Accès aux données Firestore de l'app : tout est rangé sous families/{familyId}/apps/budget/…
// Règle hors connexion : l'interface n'attend jamais la fin d'une écriture. Chaque fonction
// d'écriture renvoie la promesse uniquement pour signaler un refus du serveur.
import {
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { appCollection, getServices } from 'famille-core';
import {
  DEFAULT_CATEGORIES,
  monthOfDate,
  readCategory,
  readExpense,
  slugify,
  type Category,
  type Expense,
} from './budget';

export const APP_ID = 'budget';

const categoriesCol = (familyId: string) => appCollection(familyId, APP_ID, 'categories');
const expensesCol = (familyId: string) => appCollection(familyId, APP_ID, 'expenses');

type Unsubscribe = () => void;

/** Écoute toutes les catégories de la famille. */
export function watchCategories(
  familyId: string,
  onData: (list: Category[], fromCache: boolean) => void,
  onError: (e: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    categoriesCol(familyId),
    { includeMetadataChanges: true },
    (snap) => onData(snap.docs.map((d) => readCategory(d.id, d.data())), snap.metadata.fromCache),
    onError,
  );
}

/** Écoute les dépenses d'un mois « AAAA-MM ». */
export function watchExpenses(
  familyId: string,
  month: string,
  onData: (list: Expense[]) => void,
  onError: (e: unknown) => void,
): Unsubscribe {
  const q = query(expensesCol(familyId), where('month', '==', month));
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs
          .map((d) => readExpense(d.id, d.data()))
          .filter((e): e is Expense => e !== null),
      ),
    onError,
  );
}

export interface ExpenseInput {
  amount: number;
  categoryId: string;
  label: string;
  date: string;
}

/** Ajoute une dépense. Un document par dépense : deux téléphones ne se gênent jamais. */
export function addExpense(familyId: string, input: ExpenseInput, byName: string): Promise<void> {
  const ref = doc(expensesCol(familyId));
  const { auth } = getServices();
  return setDoc(ref, {
    amount: input.amount,
    categoryId: input.categoryId,
    label: input.label.trim(),
    date: input.date,
    month: monthOfDate(input.date),
    byUid: auth.currentUser?.uid ?? null,
    byName,
    createdAt: serverTimestamp(),
  });
}

export function updateExpense(familyId: string, id: string, input: ExpenseInput): Promise<void> {
  return updateDoc(doc(expensesCol(familyId), id), {
    amount: input.amount,
    categoryId: input.categoryId,
    label: input.label.trim(),
    date: input.date,
    month: monthOfDate(input.date),
    updatedAt: serverTimestamp(),
  });
}

export function deleteExpense(familyId: string, id: string): Promise<void> {
  return deleteDoc(doc(expensesCol(familyId), id));
}

/** Crée une catégorie et renvoie son identifiant (connu tout de suite, même hors connexion). */
export function createCategory(
  familyId: string,
  name: string,
  budget: number,
  order: number,
): { id: string; done: Promise<void> } {
  const id = `${slugify(name)}-${Date.now().toString(36)}`;
  const done = setDoc(doc(categoriesCol(familyId), id), {
    name: name.trim(),
    budget,
    order,
    createdAt: serverTimestamp(),
  });
  return { id, done };
}

export function updateCategory(
  familyId: string,
  id: string,
  patch: Partial<Pick<Category, 'name' | 'budget' | 'order'>>,
): Promise<void> {
  return setDoc(doc(categoriesCol(familyId), id), patch, { merge: true });
}

/** Supprime une catégorie. Ses dépenses restent, affichées « Sans catégorie ». */
export function deleteCategory(familyId: string, id: string): Promise<void> {
  return deleteDoc(doc(categoriesCol(familyId), id));
}

/**
 * Crée les catégories proposées. Identifiants fixes : si deux téléphones le font en même temps,
 * ils écrivent les mêmes documents au lieu de créer des doublons.
 */
export function seedDefaultCategories(familyId: string): Promise<void> {
  const { db } = getServices();
  const batch = writeBatch(db);
  DEFAULT_CATEGORIES.forEach((c, i) => {
    batch.set(doc(categoriesCol(familyId), c.id), {
      name: c.name,
      budget: c.euros * 100,
      order: i,
      createdAt: serverTimestamp(),
    });
  });
  return batch.commit();
}
