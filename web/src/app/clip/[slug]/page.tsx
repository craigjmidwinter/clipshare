type Props = { params: { slug: string } };

export default async function PublicClipPage({ params }: Props) {
  const { slug } = params;
  // Placeholder: Will fetch clip payload from edge function by slug
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Clip</h1>
      <p className="text-muted-foreground">Public slug: {slug}</p>
      <div className="aspect-video w-full max-w-3xl bg-black/5 rounded" />
    </div>
  );
}



