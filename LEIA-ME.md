# Flyers da Rádio Blackterapia

Site com duas páginas:

- `/` — o widget com o slider de flyers, para embutir em qualquer site com `<iframe>`
- `/admin` — o painel com senha para publicar, editar, ocultar, reordenar e apagar flyers

As imagens e os dados ficam guardados no **Netlify Blobs**, que já vem incluído no Netlify.

## Como colocar no ar (pelo GitHub — recomendado)

1. Crie um repositório no GitHub e envie esta pasta inteira (com `package.json`, `netlify.toml`, `public/` e `netlify/`).
2. No Netlify: **Add new site → Import an existing project → GitHub** e escolha o repositório.
   Não precisa mudar nada nas configurações de build; o `netlify.toml` já cuida disso.
3. Em **Site configuration → Environment variables**, crie a variável:
   - Nome: `ADMIN_SENHA`
   - Valor: a senha da equipe (use uma senha forte)
4. Faça um novo deploy (**Deploys → Trigger deploy**) para a senha valer.
5. Em **Site configuration → Change site name**, coloque `flyersblackterapia` (ou o nome que preferir).

> Arrastar a pasta para o Netlify Drop **não funciona** neste projeto, porque ele tem funções de servidor.
> Alternativa sem GitHub: instale o Netlify CLI (`npm i -g netlify-cli`), entre na pasta e rode
> `npm install` e depois `netlify deploy --prod`.

## Usando

- Painel: `https://SEU-SITE.netlify.app/admin`
- Ao publicar, o flyer aparece no slider em até 1 minuto.
- "Aparece a partir de" e "Sai do ar depois de" são opcionais. Sem datas, o flyer fica no slider até você ocultar ou apagar.
- Imagens grandes são reduzidas automaticamente para 1600 px no navegador antes do envio.

## Colocando o widget no seu site

Cole este código no lugar onde o slider deve aparecer (troque o endereço se o seu site tiver outro nome):

```html
<div style="width:100%;max-width:720px;margin:0 auto;height:min(80vh,680px)">
  <iframe src="https://flyersblackterapia.netlify.app"
          title="Programação — Rádio Blackterapia"
          loading="lazy"
          style="width:100%;height:100%;border:0;display:block"></iframe>
</div>
```

No WordPress, use um bloco **HTML personalizado**; em Wix ou similares, o elemento **Incorporar código / HTML**.
Ajuste `max-width` e `height` ao espaço do seu layout. O widget se adapta ao tamanho que receber,
e dentro de outro site o fundo fica transparente.

## Ajustes

Para mudar o tempo de cada flyer na tela, edite `INTERVALO` no mesmo arquivo (em milissegundos).
