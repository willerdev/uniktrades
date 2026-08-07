import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "../stores/theme";
import type { InvestStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<InvestStackParamList, "Loans">;

/** Loans feature retired — keep route for deep links. */
export function LoansScreen({ navigation }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Loans unavailable</Text>
      <Text style={[styles.copy, { color: theme.muted }]}>
        The loans product has been retired. Use Smart-Invest or your wallet instead.
      </Text>
      <Pressable
        onPress={() => navigation.navigate("InvestMain")}
        style={[styles.btn, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.btnText}>Back to Invest</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, justifyContent: "center", gap: 12 },
  title: { fontSize: 22, fontWeight: "800" },
  copy: { fontSize: 14, lineHeight: 20 },
  btn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
