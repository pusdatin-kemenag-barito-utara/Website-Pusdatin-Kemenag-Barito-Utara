import { useNavigate } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UserForm } from "@/components/users/UserForm";
import { useCreateUser } from "@/hooks/use-users";
import { toast } from "@/components/ui/Toast";
import { ArrowLeft } from "lucide-react";
import type { User } from "@/types";

export function NewUserPage() {
  const navigate = useNavigate();
  const createUser = useCreateUser();

  const handleSubmit = async (data: Partial<User>) => {
    try {
      await createUser.mutateAsync(data);
      toast("success", "Pengguna berhasil ditambahkan");
      navigate("/dashboard/users");
    } catch {
      toast("error", "Gagal menambahkan pengguna");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tambah Pengguna</h1>
          <p className="text-sm text-slate-500">Buat akun pengguna baru</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardBody>
          <UserForm
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            loading={createUser.isPending}
          />
        </CardBody>
      </Card>
    </div>
  );
}
