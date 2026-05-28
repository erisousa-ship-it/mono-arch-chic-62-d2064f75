REVOKE EXECUTE ON FUNCTION public.handle_new_svc_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.svc_bump_conversation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.svc_get_or_create_conversation(uuid) FROM PUBLIC, anon;

ALTER FUNCTION public.svc_get_or_create_conversation(uuid) SECURITY INVOKER;
ALTER FUNCTION public.svc_bump_conversation() SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.svc_get_or_create_conversation(uuid) TO authenticated, service_role;