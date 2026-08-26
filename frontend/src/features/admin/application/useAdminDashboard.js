import { useEffect, useState } from 'react';
import adminGatewayPadrao from '../infrastructure/adminGateway';
import {
  WIDGETS_PADRAO,
  alternarWidget,
  filtrarWidgetsValidos,
  moverWidget,
} from '../domain/dashboard';

export default function useAdminDashboard({ getToken, t, gateway = adminGatewayPadrao }) {
  const [state, setState] = useState({ loading: true, error: '', admin: null, dashboard: null });
  const [widgets, setWidgets] = useState([...WIDGETS_PADRAO]);
  const [draftWidgets, setDraftWidgets] = useState([...WIDGETS_PADRAO]);
  const [customizing, setCustomizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error(t('sessionRequired'));
        const resultado = await gateway.carregar(token, {
          semPermissao: t('adminPermissionDenied'),
          indisponivel: t('adminUnavailable'),
        });
        if (!active) return;
        const salvos = filtrarWidgetsValidos(resultado.widgets);
        setWidgets(salvos);
        setDraftWidgets(salvos);
        setState({ loading: false, error: '', admin: resultado.admin, dashboard: resultado.dashboard });
      } catch (error) {
        if (active) setState({ loading: false, error: error.message, admin: null, dashboard: null });
      }
    })();
    return () => { active = false; };
  }, [getToken]);

  const toggleWidget = (widget) => setDraftWidgets((atual) => alternarWidget(atual, widget));
  const moveWidget = (widget, direction) => setDraftWidgets((atual) => moverWidget(atual, widget, direction));

  function toggleCustomizing() {
    setDraftWidgets(widgets);
    setCustomizing((valor) => !valor);
    setFeedback('');
  }

  async function savePreferences(nextWidgets = draftWidgets) {
    setSaving(true);
    setFeedback('');
    try {
      const token = await getToken();
      await gateway.salvarPreferencias(token, nextWidgets, t('adminSaveFailed'));
      setWidgets(nextWidgets);
      setDraftWidgets(nextWidgets);
      setCustomizing(false);
      setFeedback(t('adminSaved'));
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    state, widgets, draftWidgets, customizing, saving, feedback,
    visibleWidgets: customizing ? draftWidgets : widgets,
    moveWidget, savePreferences, toggleCustomizing, toggleWidget,
  };
}
