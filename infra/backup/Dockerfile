# Conteneur de sauvegarde : pg_dump + restic (chiffrement côté client, déduplication,
# rétention) vers le bucket S3 « sauvegardes », planifié par cron.
FROM alpine:3.20.3
# Certificat d'autorité supplémentaire FACULTATIF (proxy TLS d'entreprise), utilisé
# uniquement pendant l'installation puis retiré : il ne reste pas dans l'image.
RUN --mount=type=secret,id=extra_ca,required=false \
    cp /etc/ssl/certs/ca-certificates.crt /tmp/ca.orig \
 && if [ -f /run/secrets/extra_ca ]; then cat /run/secrets/extra_ca >> /etc/ssl/certs/ca-certificates.crt; fi \
 && apk add --no-cache bash coreutils curl jq tzdata restic rclone postgresql15-client \
 && cp /tmp/ca.orig /etc/ssl/certs/ca-certificates.crt && rm /tmp/ca.orig
ENV TZ=Europe/Paris
COPY --chmod=755 *.sh /usr/local/bin/
WORKDIR /var/lib/backup
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["cron"]
