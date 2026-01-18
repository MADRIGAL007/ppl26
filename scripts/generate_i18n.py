import json
import os

langs = {
    'es': '[ES] ', 'fr': '[FR] ', 'de': '[DE] ', 'it': '[IT] ', 'pt': '[PT] ',
    'ru': '[RU] ', 'zh': '[ZH] ', 'ja': '[JA] ', 'ko': '[KO] ', 'ar': '[AR] ',
    'hi': '[HI] ', 'bn': '[BN] ', 'pa': '[PA] ', 'jv': '[JV] ', 'tr': '[TR] ',
    'vi': '[VI] ', 'th': '[TH] ', 'pl': '[PL] ', 'uk': '[UK] '
}

def translate_recursive(data, prefix):
    if isinstance(data, dict):
        return {k: translate_recursive(v, prefix) for k, v in data.items()}
    elif isinstance(data, str):
        return prefix + data
    return data

with open('src/assets/i18n/en.json', 'r') as f:
    en_data = json.load(f)

for lang, prefix in langs.items():
    translated = translate_recursive(en_data, prefix)
    with open(f'src/assets/i18n/{lang}.json', 'w') as f:
        json.dump(translated, f, indent=4, ensure_ascii=False)
        print(f"Generated {lang}.json")
