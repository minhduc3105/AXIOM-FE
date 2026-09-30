import { useEffect, useId, useState } from "react";
import { CircleHelpIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { PendingUserInput, UserInputAnswer } from "../model/types";

export function AskUserQuestion({
  interaction,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  interaction: PendingUserInput;
  submitting: boolean;
  error?: string | null;
  onSubmit: (answer: UserInputAnswer) => void;
  onCancel: () => void;
}) {
  const questionId = useId();
  const [selected, setSelected] = useState("");
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    setSelected("");
    setOtherText("");
  }, [interaction.interactionId]);

  const selectedOther = selected === "other";
  const canSubmit = selectedOther
    ? otherText.trim().length > 0
    : Boolean(selected);

  const submit = () => {
    if (submitting || !canSubmit) return;
    if (selectedOther) {
      onSubmit({ otherText: otherText.trim() });
      return;
    }
    onSubmit({ selectedOptionId: selected });
  };

  return (
    <Card
      role="region"
      aria-labelledby={`${questionId}-title`}
      className="gap-4 p-4 sm:p-5"
      data-user-input-card
    >
      <CardHeader className="flex flex-row items-start gap-3 p-0">
        <div className="min-w-0 flex-1">
          <CardTitle
            id={`${questionId}-title`}
            role="heading"
            aria-level={2}
            className="mt-1"
          >
            {interaction.question}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 p-0">
        {interaction.safeguardAssessment?.findings.length ? (
          <div className="grid gap-2" aria-label="Data findings">
            {interaction.safeguardAssessment.findings.map((finding) => (
              <Alert key={finding.id}>
                <CircleHelpIcon className="size-4" />
                <AlertDescription className="grid gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong>{finding.title}</strong>
                    <Badge variant="outline">{finding.severity}</Badge>
                  </span>
                  <span>{finding.detail}</span>
                  {finding.affectedScope ? (
                    <span>
                      <strong>Affected scope:</strong> {finding.affectedScope}
                    </span>
                  ) : null}
                  {finding.impact ? (
                    <span>
                      <strong>Impact:</strong> {finding.impact}
                    </span>
                  ) : null}
                  {finding.evidenceRefs.length ? (
                    <span>
                      <strong>Evidence:</strong>{" "}
                      {finding.evidenceRefs.join(", ")}
                    </span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        ) : null}

        <FieldSet className="gap-2">
          <FieldLegend className="sr-only">Choose one answer</FieldLegend>
          <RadioGroup
            value={selected}
            onValueChange={(value) => setSelected(value ?? "")}
            disabled={submitting}
          >
            {interaction.options.slice(0, 3).map((option) => {
              const optionId = `${questionId}-${encodeURIComponent(option.id)}`;
              return (
                <FieldLabel
                  key={option.id}
                  htmlFor={optionId}
                  className="cursor-pointer rounded-xl has-data-checked:border-border has-data-checked:bg-transparent dark:has-data-checked:border-border dark:has-data-checked:bg-transparent"
                >
                  <Field orientation="horizontal" className="items-start gap-3">
                    <RadioGroupItem
                      id={optionId}
                      value={option.id}
                      className="mt-1"
                    />
                    <FieldContent className="gap-0.5">
                      <FieldTitle>{option.label}</FieldTitle>
                      {option.description ? (
                        <FieldDescription>
                          {option.description}
                        </FieldDescription>
                      ) : null}
                      {option.source ? (
                        <FieldDescription>
                          Source: {option.source}
                        </FieldDescription>
                      ) : null}
                    </FieldContent>
                  </Field>
                </FieldLabel>
              );
            })}
            <FieldLabel
              htmlFor={`${questionId}-other`}
              className="cursor-pointer rounded-xl has-data-checked:border-border has-data-checked:bg-transparent dark:has-data-checked:border-border dark:has-data-checked:bg-transparent"
            >
              <Field orientation="horizontal" className="items-start gap-3">
                <RadioGroupItem
                  id={`${questionId}-other`}
                  value="other"
                  className="mt-1"
                />
                <FieldContent>
                  <FieldTitle>Other</FieldTitle>
                </FieldContent>
              </Field>
            </FieldLabel>
          </RadioGroup>
          {selectedOther ? (
            <Textarea
              aria-label="Your answer"
              autoFocus
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              placeholder="Tell AXIOM what you mean..."
              disabled={submitting}
              rows={2}
              maxLength={2000}
              className="min-h-20 resize-y"
            />
          ) : null}
        </FieldSet>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel question
        </Button>
        <Button
          type="button"
          disabled={submitting || !canSubmit}
          onClick={submit}
        >
          {submitting ? "Continuing..." : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}
