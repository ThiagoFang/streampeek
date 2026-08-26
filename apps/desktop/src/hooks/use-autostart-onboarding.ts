import { useEffect, useState } from "react";
import { Autostart } from "@/lib/autostart";
import { AutostartOnboardingPreference } from "@/lib/autostart-onboarding";
import { getErrorMessage } from "@/lib/error-message";
import { Toast } from "@/store/toast";

type OnboardingStage = "checking" | "prompt" | "complete";

export function useAutostartOnboarding() {
  const [stage, setStage] = useState<OnboardingStage>(() =>
    AutostartOnboardingPreference.shouldShow() ? "checking" : "complete",
  );
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    if (stage !== "checking") return;

    let active = true;
    void Autostart.isEnabled()
      .then((enabled) => {
        if (!active) return;
        if (enabled) {
          AutostartOnboardingPreference.complete();
          setStage("complete");
          return;
        }
        setStage("prompt");
      })
      .catch((error) => {
        if (!active) return;
        AutostartOnboardingPreference.complete();
        setStage("complete");
        Toast.error(getErrorMessage(error, "Não foi possível consultar o início automático"));
      });

    return () => {
      active = false;
    };
  }, [stage]);

  const skip = () => {
    AutostartOnboardingPreference.complete();
    setStage("complete");
  };

  const enable = async () => {
    setIsEnabling(true);
    try {
      await Autostart.setEnabled(true);
      AutostartOnboardingPreference.complete();
      setStage("complete");
    } catch (error) {
      Toast.error(getErrorMessage(error, "Não foi possível ativar o início automático"));
    } finally {
      setIsEnabling(false);
    }
  };

  return {
    enable,
    skip,
    isChecking: stage === "checking",
    isEnabling,
    shouldShow: stage === "prompt",
  };
}
