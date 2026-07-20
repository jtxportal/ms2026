-- ============================================================
-- TIPOVACKA MS 2026 – Migrace 004: Závěrečné vyhodnocení
-- ============================================================
-- get_final_report(): souhrn po skončení turnaje pro všechny
-- přihlášené hráče (dlouhodobé tipy všech, výplaty jackpotu).
-- Tipy ostatních se odhalí AŽ když tournament_state.ukonceno = true.
-- ============================================================

CREATE OR REPLACE FUNCTION get_final_report()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_ts        tournament_state%ROWTYPE;
  v_longterm  JSONB;
  v_payouts   JSONB;
  v_jackpot   INT;
BEGIN
  SELECT * INTO v_ts FROM tournament_state WHERE id = 1;

  IF NOT COALESCE(v_ts.ukonceno, FALSE) THEN
    RETURN jsonb_build_object('ukonceno', FALSE);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'typ',       lb.typ,
           'hodnota',   lb.hodnota,
           'castka',    lb.castka,
           'vyhra',     lb.vyhra,
           'prezdivka', p.prezdivka
         ) ORDER BY lb.typ, lb.vyhra DESC, p.prezdivka), '[]'::jsonb)
  INTO v_longterm
  FROM longterm_bets lb
  JOIN profiles p ON p.id = lb.user_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'prezdivka', p.prezdivka,
           'castka',    jp.castka,
           'duvod',     jp.duvod
         ) ORDER BY jp.castka DESC), '[]'::jsonb)
  INTO v_payouts
  FROM jackpot_payouts jp
  JOIN profiles p ON p.id = jp.user_id;

  SELECT zustatek INTO v_jackpot FROM jackpot WHERE id = 1;

  RETURN jsonb_build_object(
    'ukonceno',          TRUE,
    'vitez_ms',          v_ts.vitez_ms,
    'nejlepsi_strelec',  v_ts.nejlepsi_strelec,
    'longterm',          v_longterm,
    'payouts',           v_payouts,
    'jackpot_zustatek',  COALESCE(v_jackpot, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_final_report() TO authenticated;
