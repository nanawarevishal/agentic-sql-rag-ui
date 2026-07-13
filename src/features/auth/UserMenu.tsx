import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useLogoutMutation } from "./authApi";
import { clearCredentials } from "./authSlice";

export function UserMenu() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [logout] = useLogoutMutation();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } finally {
      dispatch(clearCredentials());
    }
  };

  return (
    <div className="user-menu">
      {user.avatar_url ? (
        <img className="user-menu-avatar" src={user.avatar_url} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="user-menu-avatar user-menu-avatar-fallback">
          {(user.display_name ?? user.email).charAt(0).toUpperCase()}
        </span>
      )}
      <span className="user-menu-name">{user.display_name ?? user.email}</span>
      <button type="button" className="user-menu-logout" onClick={handleLogout} title="Log out">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      </button>
    </div>
  );
}
