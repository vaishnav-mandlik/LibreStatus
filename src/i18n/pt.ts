import type { Dictionary } from './en';

// Brazilian Portuguese, matching the pt-BR tag in LANGUAGE_OPTIONS.
export const pt: Dictionary = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  'brand.name': 'Status Saver',

  // ── Navigation ────────────────────────────────────────────────────────────
  'nav.feed': 'Feed',
  'nav.library': 'Guardados',
  'nav.tools': 'Ferramentas',
  'nav.settings': 'Configurações',

  // ── Common ────────────────────────────────────────────────────────────────
  'common.close': 'Fechar',
  'common.cancel': 'Cancelar',
  'common.undo': 'Desfazer',
  'common.refresh': 'Atualizar',
  'common.sortBy': 'Ordenar por',
  'common.select': 'Selecionar',
  'common.retry': 'Tentar de novo',
  'common.ok': 'OK',

  // ── Error boundary ────────────────────────────────────────────────────────
  'error.title': 'Algo deu errado',
  'error.body':
    'O app encontrou um problema inesperado e parou de desenhar esta tela. Nada foi perdido, os status salvos continuam neste dispositivo.',

  // ── Onboarding ────────────────────────────────────────────────────────────
  // The three first-run intro slides, shown once after install.
  'intro.one.title': 'Todos os status, numa só grelha.',
  'intro.one.body':
    'As fotos e os vídeos que o seu app de mensagens já guardou neste telefone, reunidos num único lugar.',
  'intro.two.title': 'Guarda os que valem a pena.',
  'intro.two.body':
    'Um status desaparece em 24 horas. Guarda-o e fica uma cópia na tua galeria, numa pasta chamada Status.',
  'intro.three.title': 'Nunca sai do teu telemóvel.',
  'intro.three.body':
    'Sem conta, sem anúncios, sem rastreio. A app não tem permissão de internet, por isso nada pode ser enviado.',
  'intro.next': 'Seguinte',
  'intro.start': 'Começar',
  'intro.skip': 'Ignorar',
  'intro.progress': 'Ecrã {n} de {total}',
  'onboard.title': 'Aponte para a pasta que o seu app de mensagens já usa.',
  'onboard.body':
    'Lemos os arquivos de status em cache neste telefone. Nada é enviado: o app não tem permissão de internet nenhuma.',
  'onboard.step1':
    'Abra o seu app de mensagens e veja um status que você quer guardar.',
  'onboard.step2a': 'Volte aqui e escolha ',
  'onboard.step2Accent': 'Android › media',
  'onboard.step2b': ' no seletor que o Android mostra.',
  'onboard.step3':
    'Pronto. A partir daí, o salvamento automático pode guardar cada status novo.',
  'onboard.note':
    'Acesso somente leitura a uma pasta. Revogável a qualquer momento.',
  'onboard.cta': 'Escolher pasta',
  'onboard.skip': 'Agora não',
  'onboard.granted': 'Acesso à pasta concedido',
  'onboard.failed': 'Não foi possível abrir essa pasta',

  // ── Feed ──────────────────────────────────────────────────────────────────
  'feed.auto': 'Auto',
  'feed.autoA11y': 'O salvamento automático está ativado. Abrir Ferramentas',

  // ── Filter tabs ───────────────────────────────────────────────────────────
  'filter.all': 'Todos',
  'filter.photos': 'Fotos',
  'filter.videos': 'Vídeos',

  // ── Section eyebrows ──────────────────────────────────────────────────────
  'group.justNow': 'Agora mesmo',
  'group.earlierToday': 'Mais cedo hoje',
  'group.today': 'Hoje',
  'group.earlierWeek': 'Mais cedo nesta semana',

  // ── Tiles ─────────────────────────────────────────────────────────────────
  'tile.new': 'novo',
  'tile.saved': 'Salvo',
  'tile.video': 'Vídeo',
  'tile.photo': 'Foto',

  // ── Empty states ──────────────────────────────────────────────────────────
  'empty.feedTitle': 'Nenhum status por aqui',
  'empty.feedBody':
    'Veja um status no seu app de mensagens primeiro e volte aqui: ele vai aparecer sozinho.',
  'empty.libraryTitle': 'Nada salvo ainda',
  'empty.libraryBody':
    'Toque em um status e depois em Salvar. Tudo o que você guardar fica aqui e continua depois que as 24 horas acabam.',
  'empty.libraryAccessBody':
    'Os status guardados estão no armazenamento do telefone. Permita o acesso ao armazenamento para os ver aqui. Nada é enviado; a app não tem permissão de internet.',
  'empty.allowAccess': 'Permitir acesso ao armazenamento',
  'empty.openFeed': 'Ir para o início',
  'empty.noFolderTitle': 'Ainda nada para ler',
  'empty.noFolderBody':
    'Indique ao app a pasta onde o seu app de mensagens guarda os status e eles aparecem aqui sozinhos.',
  'empty.noStorageBody':
    'Os status são lidos do armazenamento do telefone. Permita o acesso ao armazenamento e eles aparecem aqui sozinhos.',
  'empty.allowStorage': 'Permitir acesso ao armazenamento',
  'empty.favTitle': 'Ainda sem favoritos',
  'empty.favBody': 'Toca no coração num status guardado e ele aparece aqui.',
  'empty.vaultTitle': 'O cofre está vazio',
  'empty.vaultBody':
    'Move para aqui um status guardado para o manter fora da galeria.',
  'empty.openWhatsApp': 'Abrir o app de mensagens',

  // ── Library ───────────────────────────────────────────────────────────────
  'library.all': 'Tudo salvo',
  'library.fav': 'Favoritos',
  'library.vault': 'Cofre',
  'library.meta_one': '{n} arquivo · {size}',
  'library.meta_other': '{n} arquivos · {size}',

  // ── Selection ─────────────────────────────────────────────────────────────
  'select.title': 'Selecionar itens',
  'select.hint': 'Toque para escolher',
  'select.count_one': '{n} selecionado',
  'select.count_other': '{n} selecionados',
  'select.all': 'Selecionar tudo',
  'select.clear': 'Limpar',
  'select.save': 'Salvar',
  'select.saveN': 'Salvar {n}',
  'select.delete': 'Excluir',
  'select.deleteN': 'Excluir {n}',
  'select.vault': 'Mover para o Cofre',
  'select.restore': 'Restaurar para a galeria',
  'select.share': 'Compartilhar',

  // ── Sort sheet ────────────────────────────────────────────────────────────
  'sort.new': 'Mais recentes primeiro',
  'sort.old': 'Mais antigos primeiro',
  'sort.big': 'Maior arquivo',
  'sort.type': 'Agrupar por tipo',

  // ── Tools ─────────────────────────────────────────────────────────────────
  'tools.subtitle': 'automação e armazenamento',
  'tools.autoSave': 'Salvamento automático',
  'tools.autoTitle': 'Salvar os status novos para mim',
  'tools.autoSub': 'Roda quando você abre o app. Nada sai do dispositivo.',
  'tools.whatToKeep': 'O que guardar',
  'tools.modeBoth': 'Tudo',
  'tools.modePhotos': 'Fotos',
  'tools.modeVideos': 'Vídeos',
  'tools.autoVault': 'Enviar direto para o Cofre',
  'tools.whereSaves': 'Onde os arquivos ficam',
  'tools.saveFolder': 'Pasta de destino',
  'tools.savePath': 'DCIM / Status',
  'tools.savePathLegacy': 'Pictures e Movies / Status',
  'tools.change': 'Alterar',
  'tools.storage': 'Armazenamento',
  'tools.usedTotal': '{size} guardados',
  'tools.storageReading': 'A ler o armazenamento…',
  'tools.filesKept_one': '{n} ficheiro',
  'tools.filesKept_other': '{n} ficheiros',
  'tools.photosShare': 'Fotos {size}',
  'tools.videosShare': 'Vídeos {size}',
  'tools.message': 'Mandar mensagem para um número',
  'tools.dmBody':
    'Abra um chat com qualquer número sem salvá-lo nos seus contatos.',
  'tools.dialCode': 'Código do país',
  'tools.phonePlaceholder': 'Número de telefone',
  'tools.openChat': 'Abrir chat',

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings.title': 'Configurações',
  'settings.aboutCard':
    'Todos os recursos estão ativos, de graça, para sempre. Sem anúncios, sem contas, sem permissão de internet: o app não consegue enviar seus dados para lugar nenhum.',
  'settings.appearance': 'Aparência',
  'settings.themeLight': 'Claro',
  'settings.themeDark': 'Escuro',
  'settings.themeSystem': 'Sistema',
  'settings.privacy': 'Privacidade',
  'settings.hideRecents': 'Ocultar nos recentes',
  'settings.hideRecentsSub': 'Deixa a prévia do app em branco ao alternar',
  'settings.statusFolder': 'Pasta de status',
  'settings.folderGranted': 'Android/media · concedido',
  'settings.folderMissing': 'Ainda não escolhida · toque para escolher',
  'settings.mediaAccess': 'Acesso ao armazenamento',
  'settings.mediaGranted': 'Permitido · mostra todos os guardados',
  'settings.mediaMissing': 'Não permitido · os guardados ficam ocultos',
  'settings.general': 'Geral',
  'settings.language': 'Idioma',
  'settings.languagesAvailable': '{n} disponíveis',
  'settings.shareApp': 'Compartilhar o app',
  'settings.rate': 'Avaliar a app',
  'settings.feedback': 'Enviar comentários',
  'toast.noStore': 'Nenhuma app consegue abrir esse link',
  'toast.metaLink': 'link',
  'feedback.subject': 'Comentários sobre o Status Saver',
  'settings.help': 'Ajuda',
  'settings.legal': 'Privacidade e termos',
  'settings.footer': 'Sem permissão de internet · sem rastreadores',
  'settings.madeBy': 'Made with ❤️ by Vaishnav',

  // ── Viewer ────────────────────────────────────────────────────────────────
  'viewer.captured': 'capturado',
  'viewer.size': 'tamanho',
  'viewer.type': 'tipo',
  'viewer.hint':
    'Toque duas vezes na mídia para salvar · toque nas laterais para navegar',
  'viewer.save': 'Salvar',
  'viewer.saved': 'Salvo',
  'viewer.delete': 'Eliminar',
  'viewer.share': 'Compartilhar',
  'viewer.repost': 'Repostar',
  'viewer.close': 'Fechar',
  'viewer.zoom': 'Zoom',
  'viewer.favourite': 'Favorito',
  'viewer.play': 'Reproduzir',
  'viewer.pause': 'Pausar',
  'viewer.counter': '{n} / {total}',
  'viewer.today': 'Hoje, {time}',
  'viewer.yesterday': 'Ontem, {time}',

  // ── Batch overlay ─────────────────────────────────────────────────────────
  'batch.title': 'Salvando',
  'batch.body':
    'Gravando os originais em Galeria › Status. Mantendo a qualidade total.',
  'batch.progress': '{done} / {total}',

  // ── Toasts ────────────────────────────────────────────────────────────────
  'toast.saved': 'Salvo em Galeria › Status',
  'toast.savedMany': '{n} status salvos',
  'toast.alreadySaved': 'Já está na sua biblioteca',
  'toast.metaSkip': 'skip',
  'toast.upToDate': 'Tudo em dia · verificado agora mesmo',
  'toast.metaScan': 'scan',
  'toast.movedToVault_one': '{n} status movido para o Cofre',
  'toast.movedToVault_other': '{n} status movidos para o Cofre',
  'toast.restored_one': '{n} status restaurado',
  'toast.restored_other': '{n} status restaurados',
  'toast.vaultedStillPublic':
    'Guardado no Cofre, mas a cópia da galeria continua lá',
  'toast.metaPrivate': 'private',
  'toast.shareOpened': 'Menu de compartilhamento aberto',
  'toast.shareOpenedN': 'Menu de compartilhamento aberto · {n} arquivos',
  'toast.metaSystem': 'system',
  'toast.removed_one': 'Removido da biblioteca',
  'toast.removed_other': '{n} status removidos',
  'toast.metaDeleted': 'deleted',
  'toast.openingWhatsApp': 'Abrindo o seu app de mensagens',
  'toast.metaHandoff': 'handoff',
  'toast.favAdded': 'Adicionado aos Favoritos',
  'toast.favRemoved': 'Removido dos Favoritos',
  'toast.metaLibrary': 'library',
  'toast.reposted': 'Aberto no seu app de mensagens',
  'toast.metaRepost': 'repost',
  'toast.autoOn': 'Salvamento automático ativado',
  'toast.autoOff': 'Salvamento automático desativado',
  'toast.metaTools': 'tools',
  'toast.chooseFolder': 'Escolha uma pasta no app Arquivos',
  'toast.metaStorage': 'storage',
  'toast.needDigits': 'Digite pelo menos 6 dígitos',
  'toast.needDialCode': 'Digite um código de país',
  'toast.metaCheck': 'check',
  'toast.openingChat': 'Abrindo um chat com {number}',
  'toast.metaChat': 'chat',
  'toast.lightTheme': 'O tema claro é aplicado no dispositivo',
  'toast.metaTheme': 'theme',
  'toast.folderGranted': 'Acesso à pasta concedido',
  'toast.metaSetup': 'setup',
  'toast.saveFailed': 'Não foi possível salvar esse status',
  'toast.deleteFailed': 'Não foi possível remover esse arquivo',
  'toast.permissionNeeded': 'Permita o acesso ao armazenamento para continuar',
  'toast.openSettings': 'Abrir configurações',
  'toast.whatsappMissing': 'O app de mensagens não está instalado',
  'toast.repostFailed': 'Não foi possível enviar ao app de mensagens',
  'toast.autoSaved_one': '{n} status novo salvo automaticamente',
  'toast.autoSaved_other': '{n} status novos salvos automaticamente',

  // ── Confirmations ─────────────────────────────────────────────────────────
  'confirm.deleteTitle_one': 'Remover {n} status?',
  'confirm.deleteTitle_other': 'Remover {n} status?',
  'confirm.deleteBody':
    'Saem da tua biblioteca e da galeria. Não é possível anular.',
  'confirm.delete': 'Remover',
  'confirm.cancel': 'Manter',

  // ── Permission guide ──────────────────────────────────────────────────────
  'guide.title': 'Escolhendo a pasta',
  'guide.intro':
    'O Android mostra o próprio seletor de arquivos. Dois toques e pronto.',
  'guide.step1': 'No seletor, abra Android › media e toque em Usar esta pasta.',
  'guide.step2':
    'Confirme com Permitir. O acesso é somente leitura e você pode revogá-lo a qualquer momento.',
  'guide.open': 'Abrir o seletor',
  'guide.mockInternal': 'Armazenamento interno',
  'guide.mockUseFolder': 'Usar esta pasta',
  'guide.mockAllowTitle': 'Permitir acesso a media?',
  'guide.mockAllowBody':
    'Isso permite que o Status Saver leia os arquivos de status em cache aqui.',
  'guide.mockAllow': 'Permitir',

  // ── Help ──────────────────────────────────────────────────────────────────
  'help.title': 'Ajuda',
  'help.gettingStarted': 'Primeiros passos',
  'help.q1': 'Por que não vejo nenhum status?',
  'help.a1':
    'Abra o seu app de mensagens e veja o status de alguém primeiro. O Status Saver só consegue ler o que esse app já baixou neste telefone.',
  'help.q2': 'Para onde vão os arquivos salvos?',
  'help.a2':
    'Para a tua galeria, num álbum chamado Status. O que marcares como privado fica dentro do Status Saver e nunca chega à galeria.',
  'help.q3': 'A pessoa fica sabendo que eu salvei?',
  'help.a3':
    'Não. Tudo acontece no seu dispositivo e o app não consegue acessar a internet. Tenha consideração ao recompartilhar o que as outras pessoas publicam.',
  'help.q4': 'Um status sumiu. Por quê?',
  'help.a4':
    'Os status em cache são apagados depois de 24 horas. Salve antes disso os que você quiser guardar.',
  'help.q5': 'O seletor de pastas fica recusando a minha escolha.',
  'help.a5':
    'Escolha a pasta chamada media dentro de Android, não uma pasta mais funda. O Status Saver encontra sozinho a pasta .Statuses que está dentro dela.',
  'help.troubleshooting': 'Solução de problemas',
  'help.resetFolder': 'Escolher a pasta de status de novo',
  'help.resetFolderBody':
    'Use isto se os status pararam de aparecer depois de uma atualização do seu app de mensagens.',

  // ── Privacy & terms ───────────────────────────────────────────────────────
  'about.title': 'Privacidade e termos',
  'about.tagline': 'Veja, salve e compartilhe status, totalmente offline.',
  'about.privacyHeading': 'Privacidade',
  'about.privacyBody':
    'O Status Saver não tem a permissão INTERNET, então não consegue enviar nada para lugar nenhum. Não há analytics, nem ID de publicidade, nem relatório de falhas. Ele nunca pede “Acesso a todos os arquivos”. Os arquivos de status que ele lê são os que o seu app de mensagens já guardou no seu aparelho.',
  'about.dataHeading': 'O que fica guardado',
  'about.dataBody':
    'Suas configurações, seu idioma, seus favoritos, a lista de status que você salvou e tudo o que está no Cofre. Tudo isso fica neste dispositivo e é apagado quando você desinstala o app. As cópias salvas na sua galeria ficam até você apagá-las.',
  'about.termsHeading': 'Termos',
  'about.termsBody':
    'O Status Saver é fornecido no estado em que se encontra, sem nenhuma garantia. Você é responsável pelo uso que faz das mídias que guarda: respeite a privacidade de quem as publicou e os direitos autorais de tudo o que recompartilhar.',
  'about.disclaimer':
    'O Status Saver é um app independente. Não tem vínculo com o WhatsApp LLC nem com a Meta Platforms, Inc., nem é endossado ou conectado a eles. WhatsApp e Meta são marcas dos respetivos proprietários. Este app não modifica nem interfere com nenhum app de mensagens: lê apenas os arquivos de status já guardados neste aparelho.',

  // ── Accessibility labels ──────────────────────────────────────────────────
  'a11y.refresh': 'Atualizar',
  'a11y.sort': 'Ordenar por',
  'a11y.settings': 'Configurações',
  'a11y.selectMode': 'Selecionar',
  'a11y.exitSelect': 'Sair da seleção',
  'a11y.tile': '{kind} {time}',
  'a11y.backToFeed': 'Voltar ao feed',
};
