GRANT SELECT, INSERT, UPDATE ON public.svc_conversations TO authenticated;
GRANT ALL ON public.svc_conversations TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.svc_messages TO authenticated;
GRANT ALL ON public.svc_messages TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.svc_profiles TO authenticated;
GRANT ALL ON public.svc_profiles TO service_role;

GRANT EXECUTE ON FUNCTION public.svc_get_or_create_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.svc_get_or_create_conversation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.svc_bump_conversation() TO service_role;

DROP TRIGGER IF EXISTS svc_bump_conversation_on_message ON public.svc_messages;
CREATE TRIGGER svc_bump_conversation_on_message
AFTER INSERT ON public.svc_messages
FOR EACH ROW
EXECUTE FUNCTION public.svc_bump_conversation();