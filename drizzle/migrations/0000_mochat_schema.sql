
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT 'MoChat User',
  phone text,
  bio text DEFAULT 'Hey there! I''m on MoChat 💕',
  avatar_url text,
  state text DEFAULT 'LA',
  is_demo boolean NOT NULL DEFAULT false,
  wallpaper int NOT NULL DEFAULT 0,
  status_privacy text NOT NULL DEFAULT 'everyone',
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct',
  state_code text UNIQUE,
  name text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  forwarded boolean NOT NULL DEFAULT false,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages(conversation_id, created_at);
CREATE TABLE public.message_stars (
  user_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, message_id)
);

CREATE OR REPLACE FUNCTION public.is_member(_conv uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = _conv AND user_id = auth.uid())
$$;

GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv visible" ON public.conversations FOR SELECT TO authenticated USING (type = 'state' OR public.is_member(id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members visible" ON public.conversation_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_member(conversation_id) OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.type='state'));
CREATE POLICY "members update own" ON public.conversation_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "members leave" ON public.conversation_members FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages read" ON public.messages FOR SELECT TO authenticated USING (public.is_member(conversation_id));
CREATE POLICY "messages send" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_member(conversation_id));
CREATE POLICY "messages update own" ON public.messages FOR UPDATE TO authenticated USING (sender_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.message_stars TO authenticated;
GRANT ALL ON public.message_stars TO service_role;
ALTER TABLE public.message_stars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stars own" ON public.message_stars FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_conversation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id; RETURN NEW; END $$;
CREATE TRIGGER messages_bump AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

CREATE TABLE public.statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  bg text DEFAULT '0',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
GRANT SELECT, INSERT, DELETE ON public.statuses TO authenticated;
GRANT ALL ON public.statuses TO service_role;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status read" ON public.statuses FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR (expires_at > now() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.status_privacy <> 'nobody')));
CREATE POLICY "status insert" ON public.statuses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "status delete" ON public.statuses FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.status_views (
  status_id uuid NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (status_id, viewer_id)
);
GRANT SELECT, INSERT ON public.status_views TO authenticated;
GRANT ALL ON public.status_views TO service_role;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views insert" ON public.status_views FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());
CREATE POLICY "views read" ON public.status_views FOR SELECT TO authenticated USING (
  viewer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.statuses s WHERE s.id = status_id AND s.user_id = auth.uid()));

CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'voice',
  status text NOT NULL DEFAULT 'answered',
  duration int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls read" ON public.calls FOR SELECT TO authenticated USING (caller_id = auth.uid() OR callee_id = auth.uid());
CREATE POLICY "calls insert" ON public.calls FOR INSERT TO authenticated WITH CHECK (caller_id = auth.uid());
CREATE POLICY "calls delete" ON public.calls FOR DELETE TO authenticated USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE TABLE public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
  game text NOT NULL,
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  turn uuid,
  winner uuid,
  status text NOT NULL DEFAULT 'waiting',
  scores jsonb NOT NULL DEFAULT '{"host":0,"guest":0}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_rooms TO authenticated;
GRANT ALL ON public.game_rooms TO service_role;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms read" ON public.game_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms create" ON public.game_rooms FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "rooms play" ON public.game_rooms FOR UPDATE TO authenticated
  USING (host_id = auth.uid() OR guest_id = auth.uid() OR (guest_id IS NULL AND status = 'waiting'))
  WITH CHECK (host_id = auth.uid() OR guest_id = auth.uid());
CREATE POLICY "rooms delete" ON public.game_rooms FOR DELETE TO authenticated USING (host_id = auth.uid());

CREATE TABLE public.game_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.game_messages TO authenticated;
GRANT ALL ON public.game_messages TO service_role;
ALTER TABLE public.game_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gm read" ON public.game_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "gm send" ON public.game_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Demo people
INSERT INTO public.profiles (id, name, phone, bio, avatar_url, state, is_demo, last_seen) VALUES
('00000000-0000-0000-0000-000000000001','Amaka Obi','+2348031110001','Living my best life ✨','https://i.pravatar.cc/200?img=47','LA',true, now() + interval '100 years'),
('00000000-0000-0000-0000-000000000002','Tunde Bakare','+2348031110002','Coder by day, baller by night ⚽','https://i.pravatar.cc/200?img=12','OY',true, now() - interval '1 hour'),
('00000000-0000-0000-0000-000000000003','Zainab Musa','+2348031110003','Alhamdulillah for everything 🌸','https://i.pravatar.cc/200?img=45','KN',true, now() + interval '100 years'),
('00000000-0000-0000-0000-000000000004','Chidi Eze','+2348031110004','Ludo champion 🎲 try me','https://i.pravatar.cc/200?img=13','EN',true, now() - interval '3 hours'),
('00000000-0000-0000-0000-000000000005','Blessing Udo','+2348031110005','Pink is a lifestyle 💗','https://i.pravatar.cc/200?img=44','AK',true, now() + interval '100 years'),
('00000000-0000-0000-0000-000000000006','Ibrahim Sani','+2348031110006','Abuja hustler 🏙️','https://i.pravatar.cc/200?img=14','FC',true, now() - interval '20 minutes'),
('00000000-0000-0000-0000-000000000007','Funke Adeyemi','+2348031110007','Chef & foodie 🍲','https://i.pravatar.cc/200?img=49','LA',true, now() + interval '100 years'),
('00000000-0000-0000-0000-000000000008','Emeka Nwosu','+2348031110008','Port Harcourt to the world 🌍','https://i.pravatar.cc/200?img=15','RI',true, now() - interval '2 days');

-- State groups (36 states + FCT)
INSERT INTO public.conversations (type, state_code, name) VALUES
('state','AB','Abia'),('state','AD','Adamawa'),('state','AK','Akwa Ibom'),('state','AN','Anambra'),('state','BA','Bauchi'),('state','BY','Bayelsa'),('state','BE','Benue'),('state','BO','Borno'),('state','CR','Cross River'),('state','DE','Delta'),('state','EB','Ebonyi'),('state','ED','Edo'),('state','EK','Ekiti'),('state','EN','Enugu'),('state','FC','FCT Abuja'),('state','GO','Gombe'),('state','IM','Imo'),('state','JI','Jigawa'),('state','KD','Kaduna'),('state','KN','Kano'),('state','KT','Katsina'),('state','KE','Kebbi'),('state','KO','Kogi'),('state','KW','Kwara'),('state','LA','Lagos'),('state','NA','Nasarawa'),('state','NI','Niger'),('state','OG','Ogun'),('state','ON','Ondo'),('state','OS','Osun'),('state','OY','Oyo'),('state','PL','Plateau'),('state','RI','Rivers'),('state','SO','Sokoto'),('state','TA','Taraba'),('state','YO','Yobe'),('state','ZA','Zamfara');

-- Demo members + messages in Lagos, FCT, Kano
INSERT INTO public.conversation_members (conversation_id, user_id)
SELECT c.id, p.id FROM public.conversations c CROSS JOIN public.profiles p WHERE c.state_code IN ('LA','FC','KN') AND p.is_demo;

INSERT INTO public.messages (conversation_id, sender_id, body, created_at)
SELECT c.id, m.sender::uuid, m.body, now() - (m.ago || ' minutes')::interval
FROM public.conversations c
JOIN (VALUES
 ('LA','00000000-0000-0000-0000-000000000001','Good morning Lagos! Who else is stuck in Third Mainland traffic? 😩',90),
 ('LA','00000000-0000-0000-0000-000000000007','Me oo! Leaving Lekki since 6am 😂',85),
 ('LA','00000000-0000-0000-0000-000000000002','Una should try the ferry, e dey faster 🚤',60),
 ('LA','00000000-0000-0000-0000-000000000001','Owambe this Saturday at Ikeja, everybody is invited 🎉💃',20),
 ('FC','00000000-0000-0000-0000-000000000006','Abuja people, where is the best suya spot in Wuse? 🍢',70),
 ('FC','00000000-0000-0000-0000-000000000003','Try the one beside Banex, it''s 🔥',50),
 ('FC','00000000-0000-0000-0000-000000000005','Jabi Lake mall hangout this weekend anyone?',15),
 ('KN','00000000-0000-0000-0000-000000000003','Sannu da zuwa everyone! Welcome to Kano group 🌸',100),
 ('KN','00000000-0000-0000-0000-000000000006','Durbar festival pictures coming soon 🐎',40),
 ('KN','00000000-0000-0000-0000-000000000004','Wow can''t wait to see them!',10)
) AS m(code, sender, body, ago) ON m.code = c.state_code;

-- Demo statuses
INSERT INTO public.statuses (user_id, kind, body, media_url, bg, created_at, expires_at) VALUES
('00000000-0000-0000-0000-000000000001','image','Sunday vibes 🌸','https://picsum.photos/seed/mochat1/720/1280','0', now() - interval '1 hour', now() + interval '23 hours'),
('00000000-0000-0000-0000-000000000003','text','Be kind, it''s free 💕',null,'1', now() - interval '2 hours', now() + interval '22 hours'),
('00000000-0000-0000-0000-000000000005','image','New hair who dis 💇🏾‍♀️','https://picsum.photos/seed/mochat5/720/1280','0', now() - interval '3 hours', now() + interval '21 hours'),
('00000000-0000-0000-0000-000000000007','text','Jollof rice > everything 🍛🔥',null,'2', now() - interval '5 hours', now() + interval '19 hours'),
('00000000-0000-0000-0000-000000000002','image','Match day ⚽','https://picsum.photos/seed/mochat2/720/1280','0', now() - interval '6 hours', now() + interval '18 hours');

-- Demo auto reply
CREATE OR REPLACE FUNCTION public.demo_reply(_conv uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _demo uuid; _lines text[] := ARRAY['Hahaha 😂','For real? Tell me more!','I dey come 🏃🏾‍♀️','Omo that''s mad 🔥','Sure thing 💕','Let''s play Ludo later 🎲','Lol you''re funny 😆','Okay o, no wahala 👍','Miss you! 💗','Wait, call me 📞'];
BEGIN
  IF NOT public.is_member(_conv) THEN RETURN; END IF;
  SELECT m.user_id INTO _demo FROM public.conversation_members m JOIN public.profiles p ON p.id = m.user_id JOIN public.conversations c ON c.id = m.conversation_id
   WHERE m.conversation_id = _conv AND p.is_demo AND c.type = 'direct' LIMIT 1;
  IF _demo IS NULL THEN RETURN; END IF;
  INSERT INTO public.messages (conversation_id, sender_id, body) VALUES (_conv, _demo, _lines[1 + floor(random()*10)::int]);
END $$;

-- Start / find a direct chat
CREATE OR REPLACE FUNCTION public.start_direct(_other uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL OR _other = auth.uid() THEN RAISE EXCEPTION 'invalid'; END IF;
  SELECT c.id INTO _id FROM public.conversations c
    JOIN public.conversation_members a ON a.conversation_id = c.id AND a.user_id = auth.uid()
    JOIN public.conversation_members b ON b.conversation_id = c.id AND b.user_id = _other
    WHERE c.type = 'direct' LIMIT 1;
  IF _id IS NOT NULL THEN RETURN _id; END IF;
  INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO _id;
  INSERT INTO public.conversation_members (conversation_id, user_id) VALUES (_id, auth.uid()), (_id, _other);
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.join_state(_code text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM public.conversations WHERE state_code = _code AND type = 'state';
  IF _id IS NULL OR auth.uid() IS NULL THEN RAISE EXCEPTION 'invalid'; END IF;
  INSERT INTO public.conversation_members (conversation_id, user_id) VALUES (_id, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN _id;
END $$;

-- Signup: profile, state group, 8 demo chats, 2 demo games, demo calls
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := NEW.id; _state text := coalesce(NEW.raw_user_meta_data->>'state','LA'); _conv uuid; _d record; _i int := 0;
  _first text[] := ARRAY['Hey babe! Welcome to MoChat 💕','Bro! You don join MoChat? 🔥','Salam! How are you today? 🌸','Ludo tonight? I go beat you 😂🎲','OMG your new pic is fire 😍','Abeg send me that document','Did you see the match yesterday?! ⚽','Happy weekend dear 🌴'];
  _second text[] := ARRAY['Can''t wait to gist with you 😘','Make we play Whot later','Hope your family is fine','Bring your A-game 💪🏾','Where did you buy that outfit?','I need it before 5pm please 🙏🏾','That last goal was crazy','Let''s hang out soon!'];
BEGIN
  INSERT INTO public.profiles (id, name, phone, bio, avatar_url, state)
  VALUES (_uid, coalesce(NEW.raw_user_meta_data->>'name','MoChat User'), NEW.raw_user_meta_data->>'phone',
          coalesce(NULLIF(NEW.raw_user_meta_data->>'bio',''),'Hey there! I''m on MoChat 💕'), NEW.raw_user_meta_data->>'avatar_url', _state);

  INSERT INTO public.conversation_members (conversation_id, user_id)
  SELECT id, _uid FROM public.conversations WHERE state_code = _state ON CONFLICT DO NOTHING;

  FOR _d IN SELECT id FROM public.profiles WHERE is_demo ORDER BY id LOOP
    _i := _i + 1;
    INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO _conv;
    INSERT INTO public.conversation_members (conversation_id, user_id, last_read_at) VALUES (_conv, _uid, now() - interval '1 day'), (_conv, _d.id, now());
    INSERT INTO public.messages (conversation_id, sender_id, body, created_at) VALUES
      (_conv, _d.id, _first[_i], now() - ((_i * 37 + 10) || ' minutes')::interval),
      (_conv, _d.id, _second[_i], now() - ((_i * 37) || ' minutes')::interval);
  END LOOP;

  INSERT INTO public.game_rooms (game, host_id, guest_id, status, winner, turn, state, scores) VALUES
   ('tictactoe', _uid, '00000000-0000-0000-0000-000000000004', 'finished', _uid, null,
     '{"board":["X","O","X","O","X","O",null,null,"X"]}'::jsonb, '{"host":3,"guest":1}'::jsonb),
   ('ludo', '00000000-0000-0000-0000-000000000002', _uid, 'finished', '00000000-0000-0000-0000-000000000002', null,
     '{}'::jsonb, '{"host":2,"guest":1}'::jsonb);

  INSERT INTO public.calls (caller_id, callee_id, kind, status, duration, created_at) VALUES
   ('00000000-0000-0000-0000-000000000001', _uid, 'video', 'missed', 0, now() - interval '2 hours'),
   (_uid, '00000000-0000-0000-0000-000000000004', 'voice', 'answered', 312, now() - interval '5 hours'),
   ('00000000-0000-0000-0000-000000000003', _uid, 'voice', 'answered', 95, now() - interval '1 day');

  UPDATE public.statuses s SET created_at = now() - (x.h || ' hours')::interval, expires_at = now() + ((24 - x.h) || ' hours')::interval
  FROM (SELECT id, row_number() OVER (ORDER BY created_at DESC) AS h FROM public.statuses WHERE user_id IN (SELECT id FROM public.profiles WHERE is_demo)) x
  WHERE s.id = x.id;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.demo_reply(uuid), public.start_direct(uuid), public.join_state(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demo_reply(uuid), public.start_direct(uuid), public.join_state(text), public.is_member(uuid) TO authenticated;
