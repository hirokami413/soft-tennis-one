import { useLocalStorage } from './useLocalStorage';

export type SubscriptionPlan = 'free' | 'basic' | 'light' | 'standard' | 'pro';

export const useSubscription = () => {
  const [plan, setPlan] = useLocalStorage<SubscriptionPlan>('user_subscription_plan', 'free');

  const canUseTennisNoteBase = true; // 基本的な振り返りは誰でも可能
  const canAskCoachInNote = true; // 無料枠でも、所属チームの指導者宛ての相談は可能
  const canAskCoach = plan !== 'free'; // プロコーチへの直接相談(CoachSupportView)のみサブスク制限
  const canUploadVideo = plan === 'standard' || plan === 'pro';
  const canAccessProDashboard = plan === 'pro';
  const canViewAllConsultations = plan !== 'free'; // basic以上で相談一覧を全件閲覧可

  return {
    plan,
    setPlan,
    canUseTennisNoteBase,
    canAskCoachInNote,
    canAskCoach,
    canUploadVideo,
    canAccessProDashboard,
    canViewAllConsultations,
  };
};
