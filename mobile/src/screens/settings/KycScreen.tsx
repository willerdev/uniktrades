import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../stores/auth";
import { useTheme } from "../../stores/theme";
import { PrimaryButton, ScreenState, SectionCard } from "../../components/ui";
import type { AccountStackParamList } from "../../navigation/types";
import type { KycRecord } from "../../lib/types";

export function KycScreen() {
  const { api } = useAuth();
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.users.getKyc();
      setKyc(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KYC");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) return <ScreenState title="Loading KYC…" />;
  if (error) return <ScreenState title={error} />;

  const status = kyc?.status ?? "NOT_STARTED";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={styles.pad}
    >
      <SectionCard title="Identity verification">
        <Text style={{ color: theme.muted, marginBottom: 12, lineHeight: 20 }}>
          UnikTrades uses one KYC process for everyone: government ID, AI document
          check, and a live selfie. This unlocks payouts, loans, and contract
          enrollment.
        </Text>
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: theme.cardBorder,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>
            Status: {status.replace(/_/g, " ")}
          </Text>
        </View>
        {status === "APPROVED" ? (
          <Text style={{ color: theme.success ?? theme.primary }}>
            Your identity is verified. No further action needed.
          </Text>
        ) : status === "PENDING" ? (
          <Text style={{ color: theme.muted }}>
            Your documents and liveness check are under review.
          </Text>
        ) : (
          <PrimaryButton
            label={status === "REJECTED" ? "Retry verification" : "Continue verification"}
            onPress={() => navigation.navigate("ChainEnroll")}
          />
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
});
