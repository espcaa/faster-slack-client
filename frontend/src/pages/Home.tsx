import { useNavigate } from "@solidjs/router";
import { useAuth } from "../AuthContext";

export default function Home() {
  const { setAuthed } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setAuthed(false);
    navigate("/login");
  };

  return (
    <div class="flex-center flex-col gap-lg full-height">
      <h1>login-ed</h1>
      <button class="btn btn--ghost" onClick={handleLogout}>Log out</button>
    </div>
  );
}
