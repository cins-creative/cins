import { AdminSqlPanel } from "@/components/admin/AdminSqlPanel";

type Props = {
  dbReady: boolean;
  passwordReady: boolean;
};

/** Trang /admin/sql. */
export function AdminSqlScreen({ dbReady, passwordReady }: Props) {
  return (
    <div className="page-body">
      <AdminSqlPanel dbReady={dbReady} passwordReady={passwordReady} />
    </div>
  );
}
