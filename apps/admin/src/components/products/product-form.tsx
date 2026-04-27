'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// ── Schema ──────────────────────────────────────────────────────────────────

const variantSchema = z.object({
  sku: z.string().min(1, 'SKU required'),
  color: z.string().optional(),
  colorHex: z.string().optional(),
  storage: z.string().optional(),
  ram: z.string().optional(),
  price: z.string().min(1, 'Price required'),
  compareAtPrice: z.string().optional(),
  weightKg: z.string().optional(),
  isDefault: z.boolean().optional(),
  stockQuantity: z.coerce.number().min(0).optional(),
  existingVariantId: z.string().optional(),
});

const schema = z.object({
  sku: z.string().min(1, 'SKU required'),
  name: z.string().min(1, 'Name required'),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  condition: z.enum(['NEW', 'REFURBISHED', 'OPEN_BOX']),
  warrantyMonths: z.coerce.number().min(0).max(120),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  tags: z.string(), // comma-separated, transformed on submit
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  variants: z.array(variantSchema).min(1, 'At least one variant required'),
});

type FormValues = z.infer<typeof schema>;

// ── Types ────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; children?: Category[]; }
interface Brand { id: string; name: string; }
interface ImageEntry { url: string; altText: string; isPrimary: boolean; }

interface Props {
  productId?: string;
  initialData?: any;
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadToR2(file: File): Promise<string> {
  const { uploadUrl, publicUrl } = await api.post<{ uploadUrl: string; publicUrl: string }>(
    '/media/presign',
    { filename: file.name, contentType: file.type },
  );
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!res.ok) throw new Error('Upload failed');
  return publicUrl;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductForm({ productId, initialData }: Props) {
  const router = useRouter();
  const isEdit = !!productId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [images, setImages] = useState<ImageEntry[]>(
    initialData?.images?.map((img: any) => ({
      url: img.url,
      altText: img.altText ?? '',
      isPrimary: img.isPrimary ?? false,
    })) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Flatten category tree for select
  function flattenCategories(cats: Category[], depth = 0): Array<{ id: string; name: string }> {
    return cats.flatMap((c) => [
      { id: c.id, name: `${'  '.repeat(depth)}${c.name}` },
      ...(c.children ? flattenCategories(c.children, depth + 1) : []),
    ]);
  }

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => {});
    api.get<Brand[]>('/brands').then(setBrands).catch(() => {});
  }, []);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          sku: initialData.sku ?? '',
          name: initialData.name ?? '',
          shortDescription: initialData.shortDescription ?? '',
          description: initialData.description ?? '',
          brandId: initialData.brandId ?? initialData.brand?.id ?? '',
          categoryId: initialData.categoryId ?? initialData.category?.id ?? '',
          condition: initialData.condition ?? 'NEW',
          warrantyMonths: initialData.warrantyMonths ?? 12,
          isActive: initialData.isActive ?? true,
          isFeatured: initialData.isFeatured ?? false,
          tags: (initialData.tags ?? []).join(', '),
          metaTitle: initialData.metaTitle ?? '',
          metaDescription: initialData.metaDescription ?? '',
          variants: initialData.variants?.map((v: any) => ({
            sku: v.sku,
            color: v.color ?? '',
            colorHex: v.colorHex ?? '',
            storage: v.storage ?? '',
            ram: v.ram ?? '',
            price: v.price?.toString() ?? '',
            compareAtPrice: v.compareAtPrice?.toString() ?? '',
            weightKg: v.weightKg?.toString() ?? '',
            isDefault: v.isDefault ?? false,
            stockQuantity: v.inventory?.quantity ?? 0,
            existingVariantId: v.id,
          })) ?? [{ sku: '', price: '', isDefault: true, stockQuantity: 0 }],
        }
      : {
          condition: 'NEW',
          warrantyMonths: 12,
          isActive: true,
          isFeatured: false,
          tags: '',
          variants: [{ sku: '', price: '', isDefault: true, stockQuantity: 0 }],
        },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadToR2));
      setImages((prev) => [
        ...prev,
        ...urls.map((url, i) => ({
          url,
          altText: '',
          isPrimary: prev.length === 0 && i === 0,
        })),
      ]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (prev[index]?.isPrimary && next.length > 0) next[0].isPrimary = true;
      return next;
    });
  }

  function setPrimary(index: number) {
    setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === index })));
  }

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const payload = {
        sku: values.sku,
        name: values.name,
        shortDescription: values.shortDescription || undefined,
        description: values.description || undefined,
        brandId: values.brandId || undefined,
        categoryId: values.categoryId || undefined,
        condition: values.condition,
        warrantyMonths: values.warrantyMonths,
        isActive: values.isActive,
        isFeatured: values.isFeatured,
        tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        metaTitle: values.metaTitle || undefined,
        metaDescription: values.metaDescription || undefined,
        // On create, always send stockQuantity. On edit, only send it for newly-added
        // variants — existing ones are managed via the Inventory page to avoid clobbering
        // concurrent stock adjustments.
        variants: values.variants.map((v) => {
          const { existingVariantId, stockQuantity, ...rest } = v;
          return isEdit && existingVariantId
            ? rest
            : { ...rest, stockQuantity: stockQuantity ?? 0 };
        }),
        images: images.map((img, i) => ({ url: img.url, altText: img.altText || undefined, isPrimary: img.isPrimary, sortOrder: i })),
      };

      if (isEdit) {
        await api.patch(`/admin/products/${productId}`, payload);
        toast.success('Product updated');
      } else {
        const created = await api.post<{ id: string }>('/admin/products', payload);
        toast.success('Product created');
        router.push(`/products/${(created as any).id}/edit`);
        return;
      }

      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const flatCats = flattenCategories(categories);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Basic Info ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Basic Info</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Product Name *</label>
            <input {...register('name')} className="input" placeholder="iPhone 16 Pro Max 256GB" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SKU *</label>
            <input {...register('sku')} className="input" placeholder="APPLE-IP16PM-256-BLK" />
            {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Short Description</label>
            <input {...register('shortDescription')} className="input" placeholder="One-line product summary shown in listings" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Description</label>
            <textarea {...register('description')} rows={5} className="input resize-none" placeholder="Detailed product description..." />
          </div>
        </div>
      </section>

      {/* ── Classification ────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Classification</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <select {...register('categoryId')} className="input">
              <option value="">— Select category —</option>
              {flatCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Brand</label>
            <select {...register('brandId')} className="input">
              <option value="">— Select brand —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Condition</label>
            <select {...register('condition')} className="input">
              <option value="NEW">New</option>
              <option value="REFURBISHED">Refurbished</option>
              <option value="OPEN_BOX">Open Box</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Warranty (months)</label>
            <input {...register('warrantyMonths')} type="number" min="0" max="120" className="input" />
          </div>
        </div>

        <div className="mt-4 flex gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input {...register('isActive')} type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-brand-500" />
            <span className="font-medium text-gray-700">Active (visible in store)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input {...register('isFeatured')} type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-brand-500" />
            <span className="font-medium text-gray-700">Featured</span>
          </label>
        </div>
      </section>

      {/* ── Images ────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Images</h2>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((img, i) => (
            <div key={img.url} className="group relative">
              <img
                src={img.url}
                alt={img.altText || 'Product image'}
                className="h-24 w-full rounded-lg border border-gray-200 object-cover"
              />
              {img.isPrimary && (
                <span className="absolute left-1 top-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Primary
                </span>
              )}
              <div className="absolute inset-0 hidden flex-col items-center justify-center gap-1 rounded-lg bg-black/50 group-hover:flex">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(i)}
                    className="rounded bg-white px-2 py-0.5 text-xs font-medium text-gray-700"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <label className={`flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-brand-500 hover:text-brand-500 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-2xl">+</span>
            <span className="text-xs">{uploading ? 'Uploading…' : 'Add image'}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
        </div>
        <p className="text-xs text-gray-400">JPG, PNG, WebP. The first image is the primary listing image.</p>
      </section>

      {/* ── Variants ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Variants</h2>
          <button
            type="button"
            onClick={() => appendVariant({ sku: '', price: '', isDefault: false })}
            className="btn-secondary py-1 text-xs"
          >
            + Add Variant
          </button>
        </div>

        {errors.variants?.root && (
          <p className="mb-3 text-xs text-red-500">{errors.variants.root.message}</p>
        )}

        <div className="space-y-4">
          {variantFields.map((field, i) => {
            const existingId = (field as any).existingVariantId as string | undefined;
            const isExisting = isEdit && !!existingId;
            return (
            <div key={field.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Variant {i + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input {...register(`variants.${i}.isDefault`)} type="checkbox" className="h-3.5 w-3.5 accent-brand-500" />
                    Default
                  </label>
                  {variantFields.length > 1 && (
                    <button type="button" onClick={() => removeVariant(i)} className="text-xs text-red-500 hover:text-red-700">
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">SKU *</label>
                  <input {...register(`variants.${i}.sku`)} className="input text-sm" placeholder="APPLE-IP16PM-256-BLK" />
                  {errors.variants?.[i]?.sku && (
                    <p className="mt-0.5 text-xs text-red-500">{errors.variants[i].sku?.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Price (₦) *</label>
                  <input {...register(`variants.${i}.price`)} className="input text-sm" placeholder="1299000" />
                  {errors.variants?.[i]?.price && (
                    <p className="mt-0.5 text-xs text-red-500">{errors.variants[i].price?.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Compare-at (₦)</label>
                  <input {...register(`variants.${i}.compareAtPrice`)} className="input text-sm" placeholder="1499000" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Color</label>
                  <input {...register(`variants.${i}.color`)} className="input text-sm" placeholder="Black Titanium" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Storage</label>
                  <input {...register(`variants.${i}.storage`)} className="input text-sm" placeholder="256GB" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">RAM</label>
                  <input {...register(`variants.${i}.ram`)} className="input text-sm" placeholder="8GB" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Weight (kg)</label>
                  <input {...register(`variants.${i}.weightKg`)} className="input text-sm" placeholder="0.221" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Color Hex</label>
                  <div className="flex gap-2">
                    <input {...register(`variants.${i}.colorHex`)} className="input text-sm" placeholder="#1C1C1E" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    {isExisting ? 'Current Stock' : 'Initial Stock'}
                  </label>
                  <input
                    {...register(`variants.${i}.stockQuantity`)}
                    type="number"
                    min={0}
                    disabled={isExisting}
                    className="input text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="0"
                  />
                  {isExisting && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      Adjust on the{' '}
                      <a href="/inventory" className="text-brand-500 hover:underline">
                        Inventory
                      </a>{' '}
                      page
                    </p>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* ── SEO & Tags ────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">SEO & Tags</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tags</label>
            <input {...register('tags')} className="input" placeholder="5G, wireless charging, flagship (comma-separated)" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Meta Title <span className="text-xs text-gray-400">(max 70 chars)</span></label>
            <input {...register('metaTitle')} className="input" maxLength={70} />
            {errors.metaTitle && <p className="mt-1 text-xs text-red-500">{errors.metaTitle.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Meta Description <span className="text-xs text-gray-400">(max 160 chars)</span></label>
            <textarea {...register('metaDescription')} rows={2} className="input resize-none" maxLength={160} />
            {errors.metaDescription && <p className="mt-1 text-xs text-red-500">{errors.metaDescription.message}</p>}
          </div>
        </div>
      </section>

      {/* ── Submit ────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving || uploading} className="btn-primary">
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
