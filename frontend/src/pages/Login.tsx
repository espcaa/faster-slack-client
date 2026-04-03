import { useNavigate } from "@solidjs/router";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { setAuthed } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    setAuthed(true);
    navigate("/");
  };

  return (
    <div class="flex-center flex-col gap-lg full-height">
      <h1>un-login-ed</h1>
      <button class="btn btn--primary" onClick={handleLogin}>Log in</button>
    </div>
  );
}
