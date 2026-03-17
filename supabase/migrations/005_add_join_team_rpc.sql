-- チームの招待コードを使用してチームに参加するための関数（RPC）
-- SECURITY DEFINERにより、RLS（Row Level Security）をバイパスして安全にチームを検索・追加します。

CREATE OR REPLACE FUNCTION join_team_by_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_team_id UUID;
    v_team_name TEXT;
    v_created_by UUID;
BEGIN
    SELECT id, name, created_by INTO v_team_id, v_team_name, v_created_by
    FROM teams WHERE code = p_code;

    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Invaild invite code';
    END IF;

    -- チームメンバーとして追加（すでに居る場合は何もしない）
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (v_team_id, auth.uid(), 'member')
    ON CONFLICT DO NOTHING;

    -- クライアント側で必要なチーム情報をJSONとして返却
    RETURN json_build_object(
        'id', v_team_id,
        'name', v_team_name,
        'code', p_code,
        'createdBy', v_created_by
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
