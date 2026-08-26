import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageUpload } from '../useImageUpload';

const BASE64 = 'data:image/png;base64,iVBORw0KGgo=';

function arquivo({ type = 'image/png', size = 1024, name = 'peca.png' } = {}) {
  return { type, size, name };
}

function evento(file) {
  return { target: { files: file ? [file] : [] } };
}

/** Substitui o FileReader do jsdom por um dublê síncrono e controlável. */
function mockarFileReader(resultado = BASE64) {
  const instancia = {
    result: resultado,
    readAsDataURL: jest.fn(function ler() {
      this.onloadend?.();
    }),
  };

  jest.spyOn(global, 'FileReader').mockImplementation(() => instancia);

  return instancia;
}

describe('useImageUpload', () => {
  it('comeca sem preview e sem erro', () => {
    const { result } = renderHook(() => useImageUpload());

    expect(result.current.imagemPreview).toBe('');
    expect(result.current.imageError).toBe('');
    expect(result.current.imageInputRef.current).toBeNull();
  });

  describe('handleImageChange', () => {
    it('converte a imagem em base64 e avisa o formulario', async () => {
      mockarFileReader();
      const onImageChange = jest.fn();
      const { result } = renderHook(() => useImageUpload());

      act(() => {
        result.current.handleImageChange(evento(arquivo()), onImageChange);
      });

      await waitFor(() => expect(result.current.imagemPreview).toBe(BASE64));
      expect(onImageChange).toHaveBeenCalledWith(BASE64);
      expect(result.current.imageError).toBe('');
    });

    it.each([['image/jpeg'], ['image/png'], ['image/webp']])(
      'aceita o formato %s',
      async (type) => {
        mockarFileReader();
        const { result } = renderHook(() => useImageUpload());

        act(() => {
          result.current.handleImageChange(evento(arquivo({ type })), jest.fn());
        });

        await waitFor(() => expect(result.current.imageError).toBe(''));
      },
    );

    it.each([['image/gif'], ['application/pdf'], ['text/plain']])(
      'recusa o formato %s',
      (type) => {
        const leitor = mockarFileReader();
        const onImageChange = jest.fn();
        const { result } = renderHook(() => useImageUpload());

        act(() => {
          result.current.handleImageChange(evento(arquivo({ type })), onImageChange);
        });

        expect(result.current.imageError).toBe('Selecione uma imagem nos formatos JPG, PNG ou WEBP.');
        expect(onImageChange).toHaveBeenCalledWith('');
        expect(result.current.imagemPreview).toBe('');
        expect(leitor.readAsDataURL).not.toHaveBeenCalled();
      },
    );

    it('recusa imagem acima de 2MB', () => {
      const leitor = mockarFileReader();
      const onImageChange = jest.fn();
      const { result } = renderHook(() => useImageUpload());

      act(() => {
        result.current.handleImageChange(
          evento(arquivo({ size: 2 * 1024 * 1024 + 1 })),
          onImageChange,
        );
      });

      expect(result.current.imageError).toBe('A imagem deve ter no máximo 2MB.');
      expect(onImageChange).toHaveBeenCalledWith('');
      expect(leitor.readAsDataURL).not.toHaveBeenCalled();
    });

    it('aceita imagem exatamente no limite de 2MB', async () => {
      mockarFileReader();
      const { result } = renderHook(() => useImageUpload());

      act(() => {
        result.current.handleImageChange(evento(arquivo({ size: 2 * 1024 * 1024 })), jest.fn());
      });

      await waitFor(() => expect(result.current.imagemPreview).toBe(BASE64));
    });

    it('limpa a selecao quando o usuario cancela o seletor de arquivos', () => {
      const onImageChange = jest.fn();
      const { result } = renderHook(() => useImageUpload());

      act(() => {
        result.current.setImagemPreview(BASE64);
      });
      act(() => {
        result.current.handleImageChange(evento(null), onImageChange);
      });

      expect(onImageChange).toHaveBeenCalledWith('');
      expect(result.current.imagemPreview).toBe('');
    });

    it('limpa o input de arquivo ao recusar a imagem, permitindo reescolher a mesma', () => {
      mockarFileReader();
      const { result } = renderHook(() => useImageUpload());
      const input = { value: 'C:\\fakepath\\peca.gif' };
      result.current.imageInputRef.current = input;

      act(() => {
        result.current.handleImageChange(evento(arquivo({ type: 'image/gif' })), jest.fn());
      });

      expect(input.value).toBe('');
    });

    it('limpa o erro anterior ao escolher uma imagem valida', async () => {
      mockarFileReader();
      const { result } = renderHook(() => useImageUpload());

      act(() => {
        result.current.setImageError('A imagem deve ter no máximo 2MB.');
      });
      act(() => {
        result.current.handleImageChange(evento(arquivo()), jest.fn());
      });

      await waitFor(() => expect(result.current.imageError).toBe(''));
    });
  });

  describe('removerImagem', () => {
    it('zera preview, erro e o input do arquivo', () => {
      const onImageChange = jest.fn();
      const { result } = renderHook(() => useImageUpload());
      const input = { value: 'C:\\fakepath\\peca.png' };
      result.current.imageInputRef.current = input;

      act(() => {
        result.current.setImagemPreview(BASE64);
        result.current.setImageError('erro anterior');
      });
      act(() => {
        result.current.removerImagem(onImageChange);
      });

      expect(onImageChange).toHaveBeenCalledWith('');
      expect(result.current.imagemPreview).toBe('');
      expect(result.current.imageError).toBe('');
      expect(input.value).toBe('');
    });

    it('nao quebra quando o input ainda nao foi montado', () => {
      const { result } = renderHook(() => useImageUpload());

      expect(() => {
        act(() => { result.current.removerImagem(jest.fn()); });
      }).not.toThrow();
    });
  });
});
