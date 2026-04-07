import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import {
  getOAuthProvider,
  createOAuthProvider,
  updateOAuthProvider,
} from "@/api";
import { toast } from "sonner";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";
import TagInput from "@/components/TagInput";

interface OAuthProviderData {
  id: string;
  provider: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl: string;
  scopesAvailable: string[];
  redirectUriBase: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FormState {
  provider: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl: string;
  scopesAvailable: string[];
  redirectUriBase: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  provider: "",
  displayName: "",
  clientId: "",
  clientSecret: "",
  authUrl: "",
  tokenUrl: "",
  revokeUrl: "",
  scopesAvailable: [],
  redirectUriBase: "",
  isActive: true,
};

export default function OAuthProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [original, setOriginal] = useState<OAuthProviderData | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showSecret, setShowSecret] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [unsavedDialog, allowNavigation] = useUnsavedChanges(dirty);

  useEffect(() => {
    if (!isNew && id) {
      getOAuthProvider(id)
        .then((r) => {
          const data = r as OAuthProviderData;
          setOriginal(data);
          setForm({
            provider: data.provider,
            displayName: data.displayName,
            clientId: data.clientId,
            clientSecret: "",
            authUrl: data.authUrl,
            tokenUrl: data.tokenUrl,
            revokeUrl: data.revokeUrl || "",
            scopesAvailable: data.scopesAvailable || [],
            redirectUriBase: data.redirectUriBase,
            isActive: data.isActive,
          });
          setLoading(false);
        })
        .catch((e: Error) => toast.error(e.message));
    }
  }, [id, isNew]);

  function handleChange(key: keyof FormState, value: string | boolean | string[]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    if (!form.provider.trim()) return toast.error("Provider is required");
    if (!form.displayName.trim()) return toast.error("Display Name is required");
    if (!form.clientId.trim()) return toast.error("Client ID is required");
    if (isNew && !form.clientSecret.trim())
      return toast.error("Client Secret is required");
    if (!form.authUrl.trim()) return toast.error("Auth URL is required");
    if (!form.tokenUrl.trim()) return toast.error("Token URL is required");
    if (form.scopesAvailable.length === 0)
      return toast.error("At least one scope is required");
    if (!form.redirectUriBase.trim())
      return toast.error("Redirect URI Base is required");

    const payload: Record<string, unknown> = { ...form };
    // 편집 시 clientSecret이 빈 값이면 전송하지 않음 (기존값 유지)
    if (!isNew && !form.clientSecret) {
      delete payload.clientSecret;
    }

    try {
      if (isNew) {
        const created = (await createOAuthProvider(payload)) as OAuthProviderData;
        setDirty(false);
        allowNavigation();
        toast.success("Created");
        navigate(`/backoffice/oauth-providers/${created.id}`, { replace: true });
      } else if (id) {
        const updated = (await updateOAuthProvider(id, payload)) as OAuthProviderData;
        setOriginal(updated);
        setForm((prev) => ({ ...prev, clientSecret: "" }));
        setDirty(false);
        toast.success("Saved");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function handleCancel() {
    if (isNew) {
      navigate("/backoffice/oauth-providers");
      return;
    }
    if (!original) return;
    setForm({
      provider: original.provider,
      displayName: original.displayName,
      clientId: original.clientId,
      clientSecret: "",
      authUrl: original.authUrl,
      tokenUrl: original.tokenUrl,
      revokeUrl: original.revokeUrl || "",
      scopesAvailable: original.scopesAvailable || [],
      redirectUriBase: original.redirectUriBase,
      isActive: original.isActive,
    });
    setDirty(false);
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      {unsavedDialog}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/backoffice/oauth-providers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← OAuth Providers
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          {isNew ? "New OAuth Provider" : original?.displayName}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={isNew ? false : !dirty}
            onClick={handleSave}
          >
            {isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Provider</label>
              <Input
                value={form.provider}
                placeholder="google"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("provider", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                고유 코드 (영소문자, 예: google, slack)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={form.displayName}
                placeholder="Google"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("displayName", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Client ID</label>
              <Input
                value={form.clientId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("clientId", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Client Secret</label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={form.clientSecret}
                  placeholder={isNew ? "" : "빈 값이면 기존값 유지"}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange("clientSecret", e.target.value)
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!isNew && original?.clientSecret && (
                <p className="text-xs text-muted-foreground mt-1">
                  현재: {original.clientSecret}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Auth URL</label>
              <Input
                value={form.authUrl}
                placeholder="https://accounts.google.com/o/oauth2/v2/auth"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("authUrl", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Token URL</label>
              <Input
                value={form.tokenUrl}
                placeholder="https://oauth2.googleapis.com/token"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("tokenUrl", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Revoke URL</label>
              <Input
                value={form.revokeUrl}
                placeholder="https://oauth2.googleapis.com/revoke (선택)"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("revokeUrl", e.target.value)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Redirect URI Base</label>
              <Input
                value={form.redirectUriBase}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleChange("redirectUriBase", e.target.value)
                }
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Scopes Available</label>
              <TagInput
                value={form.scopesAvailable}
                onChange={(tags) => handleChange("scopesAvailable", tags)}
                placeholder="scope 입력 후 Enter"
              />
              <p className="text-xs text-muted-foreground mt-1">
                이 Provider가 지원하는 scope 목록 (예: spreadsheets, calendar, drive)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Active</label>
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleChange("isActive", e.target.checked)
                    }
                    className="rounded border-input"
                  />
                  <span className="text-sm">
                    {form.isActive ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>
            </div>
          </div>
          {!isNew && original && (
            <p className="text-xs text-muted-foreground mt-3">
              ID: {original.id}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
