import { useState } from "react";
import { createProduct } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onAdded: () => void;
}

export default function AddProductDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    units_sold: "",
    trend: "stable",
    cluster: "question-mark",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.price) {
      toast.error("Please fill required fields");
      return;
    }
    setLoading(true);
    const price = parseFloat(form.price);
    const units_sold = parseInt(form.units_sold || "0");
    try {
      await createProduct({
        name: form.name,
        category: form.category,
        price,
        units_sold,
        revenue: price * units_sold,
        trend: form.trend,
        cluster: form.cluster,
      });
      toast.success("Product added!");
      setForm({ name: "", category: "", price: "", units_sold: "", trend: "stable", cluster: "question-mark" });
      setOpen(false);
      onAdded();
    } catch (err: any) {
      console.error("Insert Error:", err);
      toast.error(`Failed to add product: ${err.message || "Unknown error"}`);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Product Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Wireless Earbuds" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g., Electronics" />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Units Sold</Label>
              <Input type="number" min="0" value={form.units_sold} onChange={e => setForm(f => ({ ...f, units_sold: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Trend</Label>
              <Select value={form.trend} onValueChange={v => setForm(f => ({ ...f, trend: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Up</SelectItem>
                  <SelectItem value="down">Down</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cluster</Label>
            <Select value={form.cluster} onValueChange={v => setForm(f => ({ ...f, cluster: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="star">Star</SelectItem>
                <SelectItem value="cash-cow">Cash Cow</SelectItem>
                <SelectItem value="question-mark">Question Mark</SelectItem>
                <SelectItem value="underperformer">Underperformer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
