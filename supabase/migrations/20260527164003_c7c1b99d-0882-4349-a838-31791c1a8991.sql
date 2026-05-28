
GRANT SELECT, INSERT, UPDATE, DELETE ON public.svc_profiles TO authenticated;
GRANT SELECT ON public.svc_profiles TO anon;
GRANT ALL ON public.svc_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.svc_categories TO authenticated;
GRANT SELECT ON public.svc_categories TO anon;
GRANT ALL ON public.svc_categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.svc_conversations TO authenticated;
GRANT ALL ON public.svc_conversations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.svc_messages TO authenticated;
GRANT ALL ON public.svc_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.svc_posts TO authenticated;
GRANT SELECT ON public.svc_posts TO anon;
GRANT ALL ON public.svc_posts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.svc_subscriptions TO authenticated;
GRANT ALL ON public.svc_subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;
GRANT ALL ON public.scheduled_posts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_accounts TO authenticated;
GRANT ALL ON public.social_accounts TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
